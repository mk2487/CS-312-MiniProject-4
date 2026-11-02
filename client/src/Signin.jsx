import React,{useState} from 'react';
import {api} from './api';
export default function Signin({onSuccess,signup=false}){
 const [fields,setFields]=useState({user_id:'',password:'',name:'',age:'',occupation:'',city:''}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e){e.preventDefault();setBusy(true);setError('');try{const {user}=await api('/auth/'+(signup?'signup':'signin'),'POST',fields);await onSuccess(user);}catch(e){setError(e.message);}finally{setBusy(false);}}
 const labels={user_id:'Username',password:'Password',name:'Name',age:'Age (optional)',occupation:'Occupation (optional)',city:'Current city (optional)'};
 return <section className="form-section"><h2>{signup?'Sign up':'Sign in'}</h2><form onSubmit={submit}>{(signup?Object.keys(fields):['user_id','password']).map(key=><React.Fragment key={key}><label htmlFor={key}>{labels[key]}</label><input id={key} name={key} type={key==='password'?'password':key==='age'?'number':'text'} autoComplete={key==='password'?(signup?'new-password':'current-password'):key==='user_id'?'username':undefined} min={key==='age'?0:undefined} max={key==='age'?120:undefined} minLength={key==='password'&&signup?8:undefined} maxLength={key==='password'?128:key==='user_id'?40:100} required={['user_id','password','name'].includes(key)} value={fields[key]} onChange={e=>setFields({...fields,[key]:e.target.value})}/></React.Fragment>)}{error&&<p role="alert" className="error">{error}</p>}<button disabled={busy}>{busy?'Please wait…':signup?'Create account':'Sign in'}</button></form></section>;
}
