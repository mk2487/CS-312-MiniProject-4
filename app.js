const express = require('express');
const {DatabaseSync} = require('node:sqlite');
const {randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash} = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
function createApp(filename) {
  const app = express();
  app.set('trust proxy', 1);
  if (!filename) { fs.mkdirSync(path.join(__dirname,'data'),{recursive:true}); filename=path.join(__dirname,'data','blog.sqlite'); }
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,user_id TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,age TEXT,occupation TEXT,city TEXT);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user TEXT REFERENCES users(id),expires INTEGER);
    CREATE TABLE IF NOT EXISTS posts(id TEXT PRIMARY KEY,owner TEXT REFERENCES users(id),title TEXT,content TEXT,category TEXT,date TEXT);`);
  app.locals.db=db;
  app.use(express.json({limit:'100kb'}));
  app.use((req,res,next)=>{
    if (!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers.origin && req.headers.origin !== `${req.protocol}://${req.get('host')}` && req.headers.origin !== 'http://localhost:5173') return res.status(403).json({error:'Request origin is not allowed.'});
    const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('session='))?.slice(8);
    req.sessionToken=token ? createHash('sha256').update(token).digest('hex') : '';
    req.user=db.prepare('SELECT u.id,u.user_id,u.name,u.age,u.occupation,u.city FROM users u JOIN sessions s ON u.id=s.user WHERE s.token=? AND s.expires>?').get(req.sessionToken,Date.now());
    next();
  });
  const required=(req,res,next)=>req.user?next():res.status(401).json({error:'Please sign in.'});
  const clean=(value,max)=>typeof value==='string' && value.trim().length>0 && value.trim().length<=max;
  function session(req,res,user){
    const token=randomBytes(32).toString('hex');
    db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'),user.id,Date.now()+86400000);
    res.cookie('session',token,{httpOnly:true,sameSite:'lax',secure:req.secure,maxAge:86400000});
  }
  const attempts=new Map();
  app.use('/api/auth',(req,res,next)=>{
    if(req.method!=='POST') return next();
    const now=Date.now(), key=req.ip;
    for(const [k,v] of attempts) if(v.until<now) attempts.delete(k);
    const entry=attempts.get(key)||{count:0,until:now+600000}; attempts.set(key,entry);
    if(++entry.count>30) return res.status(429).json({error:'Too many attempts. Try again in ten minutes.'});
    next();
  });
  app.post('/api/auth/signup',(req,res)=>{
    const {user_id,password,name,age='',occupation='',city=''}=req.body;
    if(!clean(user_id,40)||! /^[a-zA-Z0-9_]+$/.test(user_id)||!clean(name,100)||typeof password!=='string'||password.length<8||password.length>128||typeof age!=='string'||(age!==''&&(!/^\d{1,3}$/.test(age)||Number(age)>120))||typeof occupation!=='string'||occupation.length>100||typeof city!=='string'||city.length>100) return res.status(400).json({error:'Use a username with letters, numbers or underscores, a name, and a password of 8–128 characters. Check optional profile details.'});
    const username=user_id.trim().toLowerCase();
    if(db.prepare('SELECT id FROM users WHERE user_id=?').get(username)) return res.status(409).json({error:'That username is already taken.'});
    const salt=randomBytes(16).toString('hex'),id=randomUUID();
    db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?)').run(id,username,name.trim(),salt+':'+scryptSync(password,salt,64).toString('hex'),age,occupation.trim(),city.trim());
    const user=db.prepare('SELECT id,user_id,name,age,occupation,city FROM users WHERE id=?').get(id); session(req,res,user);res.status(201).json({user});
  });
  app.post('/api/auth/signin',(req,res)=>{
    const {user_id,password}=req.body;
    if(typeof user_id!=='string'||typeof password!=='string'||password.length>128) return res.status(400).json({error:'Enter your username and password.'});
    const row=db.prepare('SELECT * FROM users WHERE user_id=?').get(user_id.trim().toLowerCase());
    const [salt,hash]=(row?.password||'invalid:'+ '0'.repeat(128)).split(':');
    if(!timingSafeEqual(scryptSync(password,salt,64),Buffer.from(hash,'hex'))||!row) return res.status(401).json({error:'Incorrect username or password.'});
    const {password:omitted,...user}=row;session(req,res,user);res.json({user});
  });
  app.post('/api/auth/signout',(req,res)=>{db.prepare('DELETE FROM sessions WHERE token=?').run(req.sessionToken);res.clearCookie('session');res.json({success:true});});
  app.get('/api/me',(req,res)=>res.json({user:req.user||null}));
  const serialize=(row,user)=>({...row,canEdit:row.owner===user?.id});
  app.get('/api/blogs',(req,res)=>res.json({posts:db.prepare('SELECT p.*,u.name creator FROM posts p JOIN users u ON p.owner=u.id ORDER BY p.date DESC').all().map(p=>serialize(p,req.user))}));
  function validate(req,res,next){
    if(!clean(req.body.title,200)||!clean(req.body.content,20000)||!['Tech','Lifestyle','Education','Other'].includes(req.body.category)) return res.status(400).json({error:'Enter a title, blog content and valid category.'});next();
  }
  function owned(req,res,next){req.post=db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);if(!req.post)return res.status(404).json({error:'Post not found.'});if(req.post.owner!==req.user.id)return res.status(403).json({error:'You can only change your own posts.'});next();}
  const getPost=(id,user)=>serialize(db.prepare('SELECT p.*,u.name creator FROM posts p JOIN users u ON p.owner=u.id WHERE p.id=?').get(id),user);
  app.post('/api/blogs',required,validate,(req,res)=>{const id=randomUUID();db.prepare('INSERT INTO posts VALUES(?,?,?,?,?,?)').run(id,req.user.id,req.body.title.trim(),req.body.content.trim(),req.body.category,new Date().toISOString());res.status(201).json({post:getPost(id,req.user)});});
  app.put('/api/blogs/:id',required,owned,validate,(req,res)=>{db.prepare('UPDATE posts SET title=?,content=?,category=? WHERE id=?').run(req.body.title.trim(),req.body.content.trim(),req.body.category,req.params.id);res.json({post:getPost(req.params.id,req.user)});});
  app.delete('/api/blogs/:id',required,owned,(req,res)=>{db.prepare('DELETE FROM posts WHERE id=?').run(req.params.id);res.json({success:true});});
  app.use('/api',(req,res)=>res.status(404).json({error:'Endpoint not found.'}));
  app.get('/health',(req,res)=>res.json({status:'ok'}));
  app.use(express.static(path.join(__dirname,'dist')));
  app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'dist','index.html')));
  app.use((error,req,res,next)=>res.status(error.status===400?400:500).json({error:error.status===400?'Invalid JSON request.':'Something went wrong. Please try again.'}));
  return app;
}
if(require.main===module) createApp().listen(process.env.PORT||8000,()=>console.log('Blog running at http://localhost:'+(process.env.PORT||8000)));
module.exports={createApp};
