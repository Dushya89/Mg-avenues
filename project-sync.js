(function(){
  async function sb(){return window.mgSupabaseClient;}

  function installAdminAuthBridge(c){
    if(!c || window.__mgAdminAuthBridgeInstalled)return;
    window.__mgAdminAuthBridgeInstalled=true;
    document.addEventListener('submit', async function(e){
      const form=e.target;
      if(!form || form.id!=='admin-login-form')return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const email=(document.getElementById('admin-email-input')?.value||'').trim().toLowerCase();
      const password=document.getElementById('admin-password-input')?.value||'';
      if(email!=='mgavenuesgvm@gmail.com'){alert('Invalid admin email or password.');return;}
      try{
        const r=await c.auth.signInWithPassword({email,password});
        if(r.error)throw r.error;
        isAdminLoggedIn=true;
        sessionStorage.setItem('mg_admin_session','active');
        if(typeof updateAdminUIState==='function')updateAdminUIState();
        if(window.mgLoadMediaCloud)await window.mgLoadMediaCloud(true);
        toggleAdminModal();
        showToast('Admin access granted. Cloud sync is connected.');
      }catch(err){
        console.error('Admin Supabase login failed:',err);
        alert('Admin login failed: '+(err.message||'Please check the Supabase Auth password.'));
      }finally{
        const p=document.getElementById('admin-password-input');if(p)p.value='';
      }
    },true);
    window.handleAdminLogout=async function(){
      try{await c.auth.signOut();}catch(err){console.warn('Supabase logout failed:',err);}
      isAdminLoggedIn=false;sessionStorage.removeItem('mg_admin_session');
      if(typeof updateAdminUIState==='function')updateAdminUIState();
      toggleAdminModal();showToast('Logged out from Admin mode.');
    };
    c.auth.getSession().then(({data})=>{
      const u=data?.session?.user;
      if(u && (u.email||'').toLowerCase()==='mgavenuesgvm@gmail.com'){
        isAdminLoggedIn=true;sessionStorage.setItem('mg_admin_session','active');
        if(typeof updateAdminUIState==='function')updateAdminUIState();
      }
    }).catch(err=>console.warn('Admin session restore failed:',err));
  }

  async function loadProjectsCloud(){
    const c=await sb();if(!c)return;
    const r=await c.from('projects').select('id,name,status,details').order('name');
    if(r.error){console.error('Project cloud read failed:',r.error);return;}
    (r.data||[]).forEach(x=>{
      const d=x.details&&typeof x.details==='object'?x.details:{};
      projectStore[x.name]={...(projectStore[x.name]||{}),...d,title:d.title||x.name,status:x.status||d.status||'ongoing'};
    });
    syncProjectDetailsData();saveProjectStore();refreshProjectSelectors();renderProjectCards(currentProjectFilter||'all');
  }

  async function saveProjectCloud(name,p){
    const c=await sb();if(!c)throw new Error('Supabase not ready');
    const d={...p};delete d.id;delete d.name;delete d.status;
    const q=await c.from('projects').select('id').eq('name',name).maybeSingle();
    if(q.error)throw q.error;
    const payload={name,status:p.status||'ongoing',details:d};
    const r=q.data?await c.from('projects').update(payload).eq('id',q.data.id):await c.from('projects').insert(payload).select('id').single();
    if(r.error)throw r.error;
    return r.data||q.data;
  }

  async function syncPlotsCloud(name){
    const c=await sb();if(!c||typeof plotData==='undefined'||!plotData[name]||!projectStore[name])return;
    const q=await c.from('projects').select('id').eq('name',name).maybeSingle();
    if(q.error)throw q.error;if(!q.data)return;
    for(const p of plotData[name]){
      const x=await c.from('plots').upsert({
        project_id:q.data.id,plot_number:Number(p.num),
        sqyds:p.sqyds===''||p.sqyds==null?null:Number(p.sqyds),
        dimensions:String(p.dimensions||''),facing:String(p.facing||''),status:p.status||'available'
      },{onConflict:'project_id,plot_number'});
      if(x.error)throw x.error;
    }
  }

  function installProjectHooks(){
    if(window.__mgProjectHooksInstalled)return true;
    const originalSave=window.handleProjectEditSubmit;
    const originalDelete=window.deleteProject;
    if(typeof originalSave!=='function'||typeof originalDelete!=='function')return false;
    window.__mgProjectHooksInstalled=true;
    window.handleProjectEditSubmit=async function(e){
      const originalName=document.getElementById('project-edit-original-name')?.value.trim()||'';
      try{
        await originalSave(e);
        const name=document.getElementById('project-name-input')?.value.trim()||editingProjectName||originalName;
        if(name&&projectStore[name]){await saveProjectCloud(name,projectStore[name]);await syncPlotsCloud(name);}
        if(originalName&&originalName!==name){
          const c=await sb();if(c){
            const old=await c.from('projects').select('id').eq('name',originalName).maybeSingle();
            if(old.error)throw old.error;
            if(old.data){const del=await c.from('projects').delete().eq('id',old.data.id);if(del.error)throw del.error;}
          }
        }
        await loadProjectsCloud();showToast('Project saved to live database.');
      }catch(err){console.error('Project cloud save failed:',err);alert('Project save failed: '+(err.message||err));}
    };
    window.deleteProject=async function(name){
      if(!isAdminLoggedIn)return;
      if(!confirm('Delete project "'+name+'"? This cannot be undone.'))return;
      try{
        const c=await sb();
        const q=await c.from('projects').select('id').eq('name',name).maybeSingle();
        if(q.error)throw q.error;
        if(q.data){
          const d=await c.from('plots').delete().eq('project_id',q.data.id);if(d.error)throw d.error;
          const x=await c.from('projects').delete().eq('id',q.data.id);if(x.error)throw x.error;
        }
        delete projectStore[name];if(typeof plotData!=='undefined')delete plotData[name];
        syncProjectDetailsData();saveProjectStore();refreshProjectSelectors();renderProjectCards(currentProjectFilter||'all');renderAdminProjectList();
        showToast('Project deleted on all devices.');
      }catch(err){console.error('Project cloud delete failed:',err);alert('Project delete failed: '+(err.message||err));}
    };
    return true;
  }

  async function initProjectCloud(){
    try{
      const c=await sb();if(!c)return;
      installAdminAuthBridge(c);
      installProjectHooks();
      await loadProjectsCloud();
      c.channel('mg-avenues-projects-live').on('postgres_changes',{event:'*',schema:'public',table:'projects'},async()=>{try{await loadProjectsCloud();}catch(e){console.error('Project realtime refresh failed:',e);}}).subscribe();
      const hookWait=setInterval(()=>{if(installProjectHooks())clearInterval(hookWait);},300);
      setTimeout(()=>clearInterval(hookWait),30000);
    }catch(e){console.error('Project sync failed',e);}
  }
  const wait=setInterval(()=>{if(window.mgSupabaseClient){clearInterval(wait);initProjectCloud();}},300);
})();