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
      if(email!=='mgavenuesgvm@gmail.com'){
        alert('Invalid admin email or password.');
        return;
      }

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

    const localLogout=window.handleAdminLogout;
    window.handleAdminLogout=async function(){
      try{await c.auth.signOut();}catch(err){console.warn('Supabase logout failed:',err);}
      isAdminLoggedIn=false;
      sessionStorage.removeItem('mg_admin_session');
      if(typeof updateAdminUIState==='function')updateAdminUIState();
      toggleAdminModal();
      showToast('Logged out from Admin mode.');
    };

    c.auth.getSession().then(({data})=>{
      const u=data?.session?.user;
      if(u && (u.email||'').toLowerCase()==='mgavenuesgvm@gmail.com'){
        isAdminLoggedIn=true;
        sessionStorage.setItem('mg_admin_session','active');
        if(typeof updateAdminUIState==='function')updateAdminUIState();
      }
    }).catch(err=>console.warn('Admin session restore failed:',err));
  }

  async function loadProjectsCloud(){
    const c=await sb(); if(!c)return;
    const r=await c.from('projects').select('id,name,status,details').order('name');
    if(r.error) {
      // Older databases may not have the details column yet. Do not replace local data.
      console.error('Project cloud read failed:', r.error);
      return;
    }
    (r.data||[]).forEach(x=>{
      const d=x.details&&typeof x.details==='object'?x.details:{};
      projectStore[x.name]={...(projectStore[x.name]||{}),...d,title:d.title||x.name,status:x.status||d.status||'ongoing'};
    });
    syncProjectDetailsData(); saveProjectStore(); refreshProjectSelectors(); renderProjectCards(currentProjectFilter||'all');
  }
  async function saveProjectCloud(name,p){
    const c=await sb(); if(!c)throw new Error('Supabase not ready');
    const d={...p}; delete d.id; delete d.name; delete d.status;
    const q=await c.from('projects').select('id').eq('name',name).maybeSingle();
    if(q.error)throw q.error;
    const payload={name,status:p.status||'ongoing',details:d};
    const r=q.data?await c.from('projects').update(payload).eq('id',q.data.id):await c.from('projects').insert(payload);
    if(r.error)throw r.error;
  }
  const oldSave=window.handleProjectEditSubmit;
  window.handleProjectEditSubmit=async function(e){
    e.preventDefault(); if(!isAdminLoggedIn)return;
    try{
      await oldSave(e);
      const name=document.getElementById('project-name-input').value.trim();
      if(name&&projectStore[name])await saveProjectCloud(name,projectStore[name]);
      if(typeof plotData!=='undefined' && plotData[name] && projectStore[name].status==='ongoing'){
        const q=await (await sb()).from('projects').select('id').eq('name',name).single();
        if(q.error)throw q.error;
        for(const p of plotData[name]){
          const x=await (await sb()).from('plots').upsert({
            project_id:q.data.id,plot_number:Number(p.num),
            sqyds:p.sqyds===''||p.sqyds==null?null:Number(p.sqyds),
            dimensions:String(p.dimensions||''),facing:String(p.facing||''),
            status:p.status||'available'
          },{onConflict:'project_id,plot_number'});
          if(x.error)throw x.error;
        }
      }
      installAdminAuthBridge(c);
      await loadProjectsCloud();
      showToast('Project saved to live database.');
    }catch(err){console.error(err);alert('Project save failed: '+(err.message||err));}
  };
  const oldDelete=window.deleteProject;
  window.deleteProject=async function(name){
    if(!isAdminLoggedIn)return;
    if(!confirm('Delete project "'+name+'"? This cannot be undone.'))return;
    try{
      const c=await sb();
      const q=await c.from('projects').select('id').eq('name',name).maybeSingle();
      if(q.error)throw q.error;
      if(q.data){
        const d=await c.from('plots').delete().eq('project_id',q.data.id); if(d.error)throw d.error;
        const x=await c.from('projects').delete().eq('id',q.data.id); if(x.error)throw x.error;
      }
      delete projectStore[name]; if(typeof plotData!=='undefined')delete plotData[name];
      syncProjectDetailsData(); saveProjectStore(); refreshProjectSelectors(); renderProjectCards(currentProjectFilter||'all'); renderAdminProjectList();
      showToast('Project deleted on all devices.');
    }catch(err){console.error(err);alert('Project delete failed: '+(err.message||err));}
  };
  async function initProjectCloud(){
    try{
      const c=await sb(); if(!c)return;
      await loadProjectsCloud();
      c.channel('mg-avenues-projects-live').on('postgres_changes',{event:'*',schema:'public',table:'projects'},async()=>{try{await loadProjectsCloud();}catch(e){console.error(e);}}).subscribe();
    }catch(e){console.error('Project sync failed',e);}
  }
  const wait=setInterval(()=>{if(window.mgSupabaseClient){clearInterval(wait);initProjectCloud();}},300);
})();