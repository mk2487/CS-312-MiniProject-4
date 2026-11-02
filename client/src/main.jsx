import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {api} from './api';
import Signin from './Signin';
import Signup from './Signup';
import BlogPostForm,{categories} from './BlogPostForm';
import PostList from './PostList';
import MyProfile from './MyProfile';
import './style.css';
function App(){
 const [user,setUser]=useState(null),[posts,setPosts]=useState([]),[page,setPage]=useState('home'),[editing,setEditing]=useState(null),[category,setCategory]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function load(){const data=await api('/blogs');setPosts(data.posts);}
 useEffect(()=>{Promise.all([api('/me'),api('/blogs')]).then(([auth,data])=>{setUser(auth.user);setPosts(data.posts);console.log('Backend connected:',data.posts);}).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 async function signedIn(value){setUser(value);setPage('home');setEditing(null);await load();setNotice('Signed in successfully.');}
 function navigate(value){setPage(value);setEditing(null);setError('');setNotice('');}
 async function save(fields,id){const data=await api('/blogs'+(id?'/'+id:''),id?'PUT':'POST',fields);setPosts(old=>id?old.map(p=>p.id===id?data.post:p):[data.post,...old]);setEditing(null);setNotice(id?'Post updated.':'Post created.');}
 async function remove(id){await api('/blogs/'+id,'DELETE');setPosts(old=>old.filter(p=>p.id!==id));setNotice('Post deleted.');}
 async function logout(){try{await api('/auth/signout','POST');setUser(null);setEditing(null);setPage('home');await load();}catch(e){setError(e.message);}}
 const visible=posts.filter(p=>(page!=='profile'||p.owner===user?.id)&&(!category||p.category===category));
 return <><header><h1>My Blog</h1><p>A simple blog website</p><nav aria-label="Main navigation"><button onClick={()=>navigate('home')}>Home</button>{user?<><button onClick={()=>navigate('profile')}>My Profile</button><button onClick={logout}>Sign out ({user.user_id})</button></>:<><button onClick={()=>navigate('signin')}>Sign in</button><button onClick={()=>navigate('signup')}>Sign up</button></>}</nav></header><main>{loading?<p role="status">Loading blog…</p>:<>{error&&<p role="alert" className="error">{error} <button onClick={()=>window.location.reload()}>Retry</button></p>}{notice&&<p role="status">{notice}</p>}{page==='signin'?<Signin onSuccess={signedIn}/>:page==='signup'?<Signup onSuccess={signedIn}/>:<>{page==='profile'&&user&&<MyProfile user={user}/ >}{user?<BlogPostForm key={editing?.id||'new'} post={editing} onSave={save} onCancel={()=>setEditing(null)}/>:<p>Sign in or create an account to write a post.</p>}<section><h2>{page==='profile'?'My Posts':'Blog Posts'}</h2><div className="form-section"><label htmlFor="filter">Filter by category:</label><select id="filter" value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option>{categories.map(c=><option key={c}>{c}</option>)}</select></div><PostList posts={visible} onEdit={p=>{setEditing(p);window.scrollTo({top:0,behavior:'smooth'});}} onDelete={remove}/></section></>}</>}</main></>;
}
createRoot(document.getElementById('root')).render(<App/>);
