import React, { useState } from 'react';
import { Edit2, MapPin, Globe } from 'lucide-react';

export default function OrgProfileView({ profile, stats }) {
  return (
    <div className="card">
      <div className="profile-header">
        <img src={profile?.logo_url || '/default-org.png'} alt="Logo" className="org-logo" />
        <div className="profile-info">
          <h2>{profile?.organization_name}</h2>
          <p><MapPin size={16} /> {profile?.city}, {profile?.country}</p>
          <a href={profile?.website} target="_blank" rel="noreferrer"><Globe size={16} /> {profile?.website}</a>
        </div>
        <button className="btn-secondary"><Edit2 size={18} /> Edit Profile</button>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><h4>Assessments</h4><p>{stats?.hostedAssessments || 0}</p></div>
        <div className="stat-card"><h4>Contests</h4><p>{stats?.hostedContests || 0}</p></div>
        <div className="stat-card"><h4>Participants</h4><p>{stats?.totalParticipants || 0}</p></div>
        <div className="stat-card"><h4>Certificates</h4><p>{stats?.certificatesIssued || 0}</p></div>
      </div>
    </div>
  );
}
