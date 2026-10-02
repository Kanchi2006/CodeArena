const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    user: 'root', password: 'Kamakshi@23', database: 'codearena_db', host: 'localhost'
  });

  // Cleanup existing test contests
  await conn.query("DELETE FROM contests WHERE title LIKE 'Admin %' OR title LIKE 'Org %'");

  // Get Admin user ID
  const [admins] = await conn.query("SELECT id, username FROM users WHERE role = 'admin' LIMIT 1");
  const adminId = admins[0] ? admins[0].id : 1;

  // Get Org user ID and Org Profile ID
  const [orgs] = await conn.query("SELECT id FROM organization_profiles LIMIT 1");
  const orgProfileId = orgs[0] ? orgs[0].id : 1;

  // Get 5 problems
  const [probs] = await conn.query("SELECT id, title FROM problems LIMIT 5");
  const problemIds = probs.map(p => p.id);

  console.log(`Using Admin User ID: ${adminId}, Org Profile ID: ${orgProfileId}`);
  console.log(`Found Problems: ${problemIds.join(', ')}`);

  const now = new Date();
  const startTime = new Date(now.getTime() - 5 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '); // started 5 mins ago
  const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '); // ends in 7 days

  const contestsToCreate = [
    {
      title: "Admin Proctored CodeFest 2026",
      slug: "admin-proctored-codefest-2026",
      description: "Full proctored assessment security test contest created by Admin.",
      created_by: adminId,
      organization_id: null,
      security_config: {
        security_enabled: true,
        enable_webcam: true,
        enable_mic: false,
        enable_screen_share: true,
        enforce_fullscreen: true,
        disable_tab_switch: true,
        disable_copy_paste: true,
        disable_right_click: true,
        max_warnings: 3,
        violation_action: 'terminate'
      }
    },
    {
      title: "Admin Strict Hardware Proctoring Challenge",
      slug: "admin-strict-hardware-proctoring-challenge",
      description: "Contest with webcam, mic, screen share, and fullscreen enforcement.",
      created_by: adminId,
      organization_id: null,
      security_config: {
        security_enabled: true,
        enable_webcam: true,
        enable_mic: true,
        enable_screen_share: true,
        enforce_fullscreen: true,
        disable_tab_switch: true,
        disable_copy_paste: true,
        disable_right_click: true,
        max_warnings: 2,
        violation_action: 'terminate'
      }
    },
    {
      title: "Admin Standard Coding Contest",
      slug: "admin-standard-coding-contest",
      description: "Contest with basic tab-switch and copy/paste restrictions.",
      created_by: adminId,
      organization_id: null,
      security_config: {
        security_enabled: true,
        enable_webcam: false,
        enable_mic: false,
        enable_screen_share: false,
        enforce_fullscreen: false,
        disable_tab_switch: true,
        disable_copy_paste: true,
        disable_right_click: true,
        max_warnings: 5,
        violation_action: 'warn'
      }
    },
    {
      title: "Org CyberSec Proctoring Battle",
      slug: "org-cybersec-proctoring-battle",
      description: "Organization created proctored contest with live monitoring.",
      created_by: adminId,
      organization_id: orgProfileId,
      security_config: {
        security_enabled: true,
        enable_webcam: true,
        enable_mic: true,
        enable_screen_share: false,
        enforce_fullscreen: true,
        disable_tab_switch: true,
        disable_copy_paste: true,
        disable_right_click: true,
        max_warnings: 3,
        violation_action: 'terminate'
      }
    },
    {
      title: "Org Open Hackathon & Algo Contest",
      slug: "org-open-hackathon-algo-contest",
      description: "Organization created contest with right-click & copy-paste security.",
      created_by: adminId,
      organization_id: orgProfileId,
      security_config: {
        security_enabled: true,
        enable_webcam: true,
        enable_mic: false,
        enable_screen_share: false,
        enforce_fullscreen: false,
        disable_tab_switch: true,
        disable_copy_paste: true,
        disable_right_click: true,
        max_warnings: 4,
        violation_action: 'warn'
      }
    }
  ];

  for (const c of contestsToCreate) {
    const [res] = await conn.query(
      `INSERT INTO contests (slug, title, description, start_time, end_time, duration_minutes, rules, status, created_by, organization_id, security_enabled, security_config)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'live', ?, ?, 1, ?)`,
      [
        c.slug,
        c.title,
        c.description,
        startTime,
        endTime,
        120,
        'Standard fair play rules apply.',
        c.created_by,
        c.organization_id,
        JSON.stringify(c.security_config)
      ]
    );

    const contestId = res.insertId;
    console.log(`✅ Created contest ID ${contestId}: "${c.title}"`);

    // Attach problems to contest
    for (let i = 0; i < problemIds.length; i++) {
      await conn.query(
        `INSERT INTO contest_problems (contest_id, problem_id, points, order_index)
         VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE points=VALUES(points)`,
        [contestId, problemIds[i], 100 * (i + 1), i + 1]
      );
    }
    console.log(`   └─ Attached ${problemIds.length} problems to contest ${contestId}`);
  }

  await conn.end();
  console.log('\n✨ All 5 contests created successfully!');
}

run().catch(console.error);
