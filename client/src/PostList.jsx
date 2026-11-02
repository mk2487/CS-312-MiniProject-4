import React,{useState} from 'react';
export default function PostList({posts,onEdit,onDelete}){
 const [confirm,setConfirm]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function remove(id){setBusy(true);setError('');try{await onDelete(id);setConfirm(null);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <>{error&&<p role="alert" className="error">{error}</p>}{!posts.length&&<p>No posts here yet.</p>}{posts.map(post=><article className="post" key={post.id}><h3>{post.title}</h3><p className="post-info">Written by {post.creator} · {new Date(post.date).toLocaleString()}</p><p>Category: <strong>{post.category}</strong></p><p className="post-content">{post.content}</p>{post.canEdit&&<div className="buttons">{confirm===post.id?<><span>Delete this post?</span><button className="delete-button" disabled={busy} onClick={()=>remove(post.id)}>Confirm Delete</button><button disabled={busy} onClick={()=>setConfirm(null)}>Cancel</button></>:<><button onClick={()=>onEdit(post)}>Edit</button><button className="delete-button" onClick={()=>setConfirm(post.id)}>Delete</button></>}</div>}</article>)}</>;
}
