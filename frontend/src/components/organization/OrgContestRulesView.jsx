import React from 'react';

export default function OrgContestRulesView({ contest }) {
  return (
    <div style={{ padding: '24px', background: 'var(--bg-panel-solid)', borderRadius: '12px' }}>
      <h2>{contest?.title} - Rules & Instructions</h2>
      <section>
        <h4>General Rules</h4>
        <p>{contest?.rules?.general || 'Standard contest rules apply.'}</p>
      </section>
      <section>
        <h4>Code of Conduct</h4>
        <ul>
          <li>No plagiarism or sharing solutions.</li>
          <li>No collaboration between participants.</li>
        </ul>
      </section>
      <section>
        <h4>Technical Rules</h4>
        <ul>
          <li>Browser/Internet requirements: Stable connection recommended.</li>
          <li>Allowed Languages: {contest?.allowed_languages?.join(', ') || 'All'}</li>
          <li>Auto-submit: Enabled at end of duration.</li>
        </ul>
      </section>
    </div>
  );
}
