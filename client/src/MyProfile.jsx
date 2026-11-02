import React from 'react';
export default function MyProfile({user}){return <section className="form-section"><h2>My Profile</h2><p><strong>{user.name}</strong> (@{user.user_id})</p>{[['Age',user.age],['Occupation',user.occupation],['Current city',user.city]].filter(([,v])=>v).map(([k,v])=><p key={k}>{k}: {v}</p>)}</section>;}
