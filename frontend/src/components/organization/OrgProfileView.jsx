import React, { useState } from 'react';
import { Edit2, MapPin, Globe, Calendar, Users, Briefcase, User } from 'lucide-react';

export default function OrgProfileView({ profile, stats, onUpdate }) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  return (
    <div className="org-profile-view">
      <div className="profile-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', background: 'var(--bg-panel-solid)', borderRadius: '12px' }}>
        <img src={profile?.logo_url || '/default-org.png'} alt="Logo" style={{ width: '100px', height: '100px', borderRadius: '12px' }} />
        <div>
          <h2>{profile?.organization_name}</h2>
          <p><MapPin size={16} /> {profile?.city}, {profile?.country}</p>
          <a href={profile?.website} target="_blank" rel="noreferrer"><Globe size={16} /> {profile?.website}</a>
        </div>
        <button onClick={() => setIsEditModalOpen(true)} style={{ marginLeft: 'auto' }}><Edit2 size={18} /> Edit Profile</button>
      </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginTop: '20px' }}>
        <div className="stat-card"><h4>Hosted Assessments</h4><p>{stats?.hostedAssessments || 0}</p></div>
        <div className="stat-card"><h4>Hosted Contests</h4><p>{stats?.hostedContests || 0}</p></div>
        <div className="stat-card"><h4>Total Participants</h4><p>{stats?.totalParticipants || 0}</p></div>
        <div className="stat-card"><h4>Certificates Issued</h4><p>{stats?.certificatesIssued || 0}</p></div>
      </div>

      <div className="details-section" style={{ marginTop: '20px', padding: '20px', background: 'var(--bg-panel-solid)', borderRadius: '12px' }}>
        <h3>Basic Information</h3>
        <p><strong>Type:</strong> {profile?.organization_type}</p>
        <p><strong>Description:</strong> {profile?.description}</p>
        <p><strong>Industry:</strong> {profile?.industry}</p>
        <p><strong>Established:</strong> {profile?.established_year}</p>
      </div>
    </div>
  );
}
