const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createApp}=require('./app');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
test('authentication, ownership, CRUD and restart persistence',async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'react-blog-')),filename=path.join(folder,'test.sqlite');
 const app=createApp(filename),server=app.listen(0);await new Promise(r=>server.once('listening',r));
 const base='http://localhost:'+server.address().port;
 const request=async(route,method='GET',body,cookie)=>{const res=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};};
 try{
 let a=await request('/auth/signup','POST',{user_id:'alice',name:'Alice',password:'password123',city:'Phoenix'});assert.equal(a.status,201);assert.equal(a.data.user.password,undefined);const alice=a.cookie;
 assert.equal((await request('/auth/signup','POST',{user_id:'alice',name:'Alice',password:'password123'})).status,409);
 assert.equal((await request('/auth/signin','POST',{user_id:'alice',password:'wrong'})).status,401);
 assert.equal((await request('/auth/signin','POST',{user_id:'ALICE',password:'password123'})).status,200);
 assert.equal((await request('/me','GET',undefined,alice)).data.user.city,'Phoenix');
 const bob=(await request('/auth/signup','POST',{user_id:'bob',name:'Bob',password:'password123'})).cookie;
 const fields={title:'First post',content:'Hello React',category:'Tech'};
 assert.equal((await request('/blogs','POST',fields)).status,401);
 assert.equal((await request('/blogs','POST',{...fields,title:''},alice)).status,400);
 a=await request('/blogs','POST',fields,alice);assert.equal(a.status,201);const id=a.data.post.id;
 assert.equal((await request('/blogs','GET',undefined,bob)).data.posts[0].canEdit,false);
 assert.equal((await request('/blogs/'+id,'PUT',fields,bob)).status,403);
 assert.equal((await request('/blogs/'+id,'DELETE',undefined,bob)).status,403);
 a=await request('/blogs/'+id,'PUT',{...fields,title:'Updated'},alice);assert.equal(a.data.post.title,'Updated');
 const second=createApp(filename);assert.equal(second.locals.db.prepare('SELECT title FROM posts WHERE id=?').get(id).title,'Updated');second.locals.db.close();
 assert.equal((await request('/blogs/'+id,'DELETE',undefined,alice)).status,200);
 assert.equal((await request('/blogs')).data.posts.length,0);
 assert.equal((await request('/blogs/'+id,'DELETE',undefined,alice)).status,404);
 await request('/auth/signout','POST',undefined,alice);assert.equal((await request('/me','GET',undefined,alice)).data.user,null);
 } finally {await new Promise(r=>server.close(r));app.locals.db.close();fs.rmSync(folder,{recursive:true,force:true});}
});
