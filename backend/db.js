const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

let pool;

async function initDB() {
  try {
    // 1. First connect without specifying database to ensure it exists
    const tempConnection = await mysql.createConnection({
      host: DB_HOST || 'mysql_db',
      port: DB_PORT || 3306,
      user: DB_USER || 'root',
      password: DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log('Successfully connected to MySQL database engine.');
    
    // Create database if not exists
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
    await tempConnection.end();
    console.log(`Verified/Created database "${DB_NAME}".`);

    // 2. Initialize connection pool with database name
    pool = mysql.createPool({
      host: DB_HOST || 'mysql_db',
      port: DB_PORT || 3306,
      user: DB_USER || 'root',
      password: DB_PASSWORD || 'rootpassword',
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true
    });

    // 3. Check if tables exist. If not, seed them from schema.sql
    const [tables] = await pool.query("SHOW TABLES;");
    const tableList = tables.map(row => Object.values(row)[0]);

    if (!tableList.includes('users') || !tableList.includes('problems') || !tableList.includes('submissions')) {
      console.log('Tables are missing. Initializing database schema from schema.sql...');
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute schema.sql (multipleStatements is enabled)
        await pool.query(schemaSql);
        console.log('Database tables successfully initialized from schema.sql.');
      } else {
        console.warn('schema.sql not found! Cannot initialize tables automatically.');
      }
    } else {
      console.log('Verified database tables already exist.');
    }

    // 3.1 Check and add new profile columns to users table dynamically if missing
    try {
      const [columns] = await pool.query("SHOW COLUMNS FROM users;");
      const columnNames = columns.map(c => c.Field);
      if (!columnNames.includes('bio')) {
        await pool.query("ALTER TABLE users ADD COLUMN bio TEXT;");
        console.log("Added 'bio' column to users table.");
      }
      if (!columnNames.includes('github_profile')) {
        await pool.query("ALTER TABLE users ADD COLUMN github_profile VARCHAR(255);");
        console.log("Added 'github_profile' column to users table.");
      }
      if (!columnNames.includes('skills')) {
        await pool.query("ALTER TABLE users ADD COLUMN skills VARCHAR(255);");
        console.log("Added 'skills' column to users table.");
      }
      if (!columnNames.includes('display_name')) {
        await pool.query("ALTER TABLE users ADD COLUMN display_name VARCHAR(255);");
        console.log("Added 'display_name' column to users table.");
      }
      if (!columnNames.includes('is_blocked')) {
        await pool.query("ALTER TABLE users ADD COLUMN is_blocked TINYINT(1) DEFAULT 0;");
        console.log("Added 'is_blocked' column to users table.");
      }
      if (!columnNames.includes('activity_status')) {
        await pool.query("ALTER TABLE users ADD COLUMN activity_status VARCHAR(50) DEFAULT 'offline';");
        console.log("Added 'activity_status' column to users table.");
      }
      if (!columnNames.includes('featured_milestone')) {
        await pool.query("ALTER TABLE users ADD COLUMN featured_milestone INT DEFAULT NULL;");
        console.log("Added 'featured_milestone' column to users table.");
      }
      if (!columnNames.includes('auth_provider')) {
        await pool.query("ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'local';");
        console.log("Added 'auth_provider' column to users table.");
      }
      if (!columnNames.includes('provider_id')) {
        await pool.query("ALTER TABLE users ADD COLUMN provider_id VARCHAR(255) DEFAULT NULL;");
        console.log("Added 'provider_id' column to users table.");
      }
      if (!columnNames.includes('avatar_url')) {
        await pool.query("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) DEFAULT NULL;");
        console.log("Added 'avatar_url' column to users table.");
      }
      // Ensure password column can accept NULL for OAuth users and role ENUM includes organization
      try {
        await pool.query("ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL;");
        await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'organization', 'admin') DEFAULT 'user';");
      } catch (alterPassErr) {
        // Ignore if already modified
      }
    } catch (columnErr) {
      console.warn("Could not dynamically alter users columns (checking/migrating):", columnErr.message);
    }

    // 3.1b Check and add starter_code to problems table dynamically if missing
    try {
      const [columns] = await pool.query("SHOW COLUMNS FROM problems;");
      const columnNames = columns.map(c => c.Field);
      if (!columnNames.includes('starter_code')) {
        await pool.query("ALTER TABLE problems ADD COLUMN starter_code JSON;");
        console.log("Added 'starter_code' column to problems table.");
      }
    } catch (columnErr) {
      console.warn("Could not dynamically alter problems columns (checking/migrating):", columnErr.message);
    }

    // 3.1c Ensure user_problem_attempts table exists
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_problem_attempts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          problem_id INT NOT NULL,
          failed_attempt_count INT DEFAULT 0,
          editorial_unlocked TINYINT(1) DEFAULT 0,
          solved TINYINT(1) DEFAULT 0,
          first_solved_at TIMESTAMP NULL,
          last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY user_prob_unique (user_id, problem_id)
        ) ENGINE=InnoDB;
      `);
      console.log("Verified 'user_problem_attempts' table exists.");
    } catch (tableErr) {
      console.warn("Could not create user_problem_attempts table:", tableErr.message);
    }

    // 3.1e Ensure organization_profiles table exists
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS organization_profiles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT UNIQUE NOT NULL,
          organization_name VARCHAR(255) NOT NULL,
          organization_type VARCHAR(100) DEFAULT 'Private Limited',
          website VARCHAR(255),
          official_email VARCHAR(255),
          phone_number VARCHAR(50),
          address TEXT,
          country VARCHAR(100) DEFAULT 'India',
          state VARCHAR(100),
          city VARCHAR(100),
          reg_certificate VARCHAR(255),
          pan_card VARCHAR(255),
          gstin VARCHAR(100),
          govt_id VARCHAR(255),
          selfie_id VARCHAR(255),
          verification_status ENUM('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          verified_at TIMESTAMP NULL DEFAULT NULL,
          rejection_reason TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `);
      console.log("Verified 'organization_profiles' table exists.");
    } catch (orgTableErr) {
      console.warn("Could not create organization_profiles table:", orgTableErr.message);
    }

    // 3.1d Ensure certificates & achievement_configs tables exist
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS certificates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          milestone INT NOT NULL,
          verification_code VARCHAR(100) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          theme VARCHAR(50) NOT NULL,
          motivation_message TEXT NOT NULL,
          revoked_at TIMESTAMP NULL DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY user_milestone_unique (user_id, milestone),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS achievement_configs (
          milestone INT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          theme VARCHAR(50) NOT NULL,
          motivation_message TEXT NOT NULL,
          description_template TEXT NOT NULL,
          is_enabled TINYINT(1) DEFAULT 1
        ) ENGINE=InnoDB;
      `);

      // Pre-seed standard achievement configurations
      const defaultConfigs = [
        [5, '5 Problems Solved', 'bronze', 'Every expert was once a beginner.', 'This certificate is presented to {userName} in appreciation of successfully solving 5 accepted coding problems on CodeArena.'],
        [30, '30 Problems Solved', 'blue', 'Small steps build great developers.', 'This certificate is presented to {userName} in appreciation of successfully solving 30 accepted coding problems on CodeArena.'],
        [50, '50 Problems Solved', 'emerald', 'Consistency turns effort into progress.', 'This certificate is presented to {userName} in appreciation of successfully solving 50 accepted coding problems on CodeArena.'],
        [100, '100 Problems Solved', 'purple', 'Better code. Brighter future.', 'This certificate is presented to {userName} in appreciation of successfully solving 100 accepted coding problems on CodeArena.'],
        [120, '120 Problems Solved', 'orange', 'More practice. More possibilities.', 'This certificate is presented to {userName} in appreciation of successfully solving 120 accepted coding problems on CodeArena.'],
        [150, '150 Problems Solved', 'teal', 'Solve. Learn. Grow.', 'This certificate is presented to {userName} in appreciation of successfully solving 150 accepted coding problems on CodeArena.'],
        [200, '200 Problems Solved', 'indigo', 'Great problem solvers build the future.', 'This certificate is presented to {userName} in appreciation of successfully solving 200 accepted coding problems on CodeArena.']
      ];

      for (const [milestone, title, theme, motivation, desc] of defaultConfigs) {
        await pool.query(`
          INSERT INTO achievement_configs (milestone, title, theme, motivation_message, description_template, is_enabled)
          VALUES (?, ?, ?, ?, ?, 1)
          ON DUPLICATE KEY UPDATE 
            title = VALUES(title), 
            theme = VALUES(theme), 
            motivation_message = VALUES(motivation_message), 
            description_template = VALUES(description_template);
        `, [milestone, title, theme, motivation, desc]);
      }

      console.log("Verified 'certificates' & 'achievement_configs' tables and pre-seeded milestone configs.");
    } catch (certErr) {
      console.warn("Could not create certificates / achievement_configs table:", certErr.message);
    }

    // 3.1e Ensure Assessment System tables exist
    try {
      const [tables] = await pool.query("SHOW TABLES;");
      const tableList = tables.map(row => Object.values(row)[0]);

      if (!tableList.includes('assessments')) {
        console.log("Initializing Assessment System database tables...");
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          const schemaSql = fs.readFileSync(schemaPath, 'utf8');
          await pool.query(schemaSql);
          console.log("Assessment System database tables successfully created.");
        }
      }

      // Seed initial demo assessments if empty
      const [assessmentsCount] = await pool.query("SELECT COUNT(*) as count FROM assessments;");
      if (assessmentsCount[0].count === 0) {
        console.log("Seeding initial CodeArena Demo Assessments...");
        
        // 1. Full Stack Developer Assessment
        const [ass1] = await pool.query(`
          INSERT INTO assessments (
            slug, title, description, assessment_type, difficulty, category, 
            duration_minutes, passing_score_percentage, default_positive_marks, default_negative_marks,
            attempt_limit, random_question_order, random_option_order, visibility,
            instructions, rules, status
          ) VALUES (
            'java-web-developer-screening',
            'Full Stack Java & Web Developer Screening',
            'Comprehensive technical evaluation covering Java fundamentals, Data Structures, JavaScript, Async Programming, and Algorithmic Coding.',
            'Mixed', 'Medium', 'Software Engineering',
            60, 60.00, 2.00, 0.50,
            2, 0, 0, 'PUBLIC',
            '1. Ensure a stable internet connection before starting.\n2. Total assessment duration is 60 minutes.\n3. Negative marking (-0.5) applies to wrong MCQ answers.\n4. You can navigate freely between questions.\n5. Click "Submit Assessment" when finished.',
            'Do not open unauthorized tabs or external resources during the test.',
            'PUBLISHED'
          )
        `);
        const assId1 = ass1.insertId;

        // Sections for Assessment 1
        const [sec1] = await pool.query(`
          INSERT INTO assessment_sections (assessment_id, title, description, order_index)
          VALUES (?, 'Section 1: Core Programming & Concepts', 'Multiple choice and output prediction questions on Java and JavaScript.', 1)
        `, [assId1]);
        const secId1 = sec1.insertId;

        const [sec2] = await pool.query(`
          INSERT INTO assessment_sections (assessment_id, title, description, order_index)
          VALUES (?, 'Section 2: Algorithmic Coding Challenges', 'Solve coding problems with clean logic and optimal time complexity.', 2)
        `, [assId1]);
        const secId2 = sec2.insertId;

        // Questions for Section 1
        await pool.query(`
          INSERT INTO assessment_questions (assessment_id, section_id, question_type, question_text, options, correct_answers, explanation, marks, negative_marks, order_index)
          VALUES 
          (?, ?, 'mcq', 'What is the time complexity of searching an element in a balanced Binary Search Tree (BST)?', 
           ?, ?, 'In a balanced BST, each step divides the search space in half, resulting in O(log N) time complexity.', 2.00, 0.50, 1),
          (?, ?, 'multiple_select', 'Which of the following are valid primitive data types in JavaScript?',
           ?, ?, 'In JavaScript, string, number, boolean, symbol, bigint, null, and undefined are primitives.', 3.00, 0.50, 2),
          (?, ?, 'output_based', 'What will be the output of the following JavaScript snippet?',
           ?, ?, 'Because i is declared with var, the loop finishes and i equals 3 when the setTimeout callbacks execute after 10ms.', 2.00, 0.50, 3)
        `, [
          assId1, secId1,
          JSON.stringify([
            { id: 'opt1', text: 'O(1)' },
            { id: 'opt2', text: 'O(log N)', is_correct: true },
            { id: 'opt3', text: 'O(N)' },
            { id: 'opt4', text: 'O(N log N)' }
          ]),
          JSON.stringify(['opt2']),
          assId1, secId1,
          JSON.stringify([
            { id: 'opt1', text: 'String', is_correct: true },
            { id: 'opt2', text: 'Number', is_correct: true },
            { id: 'opt3', text: 'ArrayList' },
            { id: 'opt4', text: 'Boolean', is_correct: true }
          ]),
          JSON.stringify(['opt1', 'opt2', 'opt4']),
          assId1, secId1,
          JSON.stringify([
            { id: 'opt1', text: '0 1 2' },
            { id: 'opt2', text: '3 3 3', is_correct: true },
            { id: 'opt3', text: 'undefined undefined undefined' },
            { id: 'opt4', text: 'ReferenceError' }
          ]),
          JSON.stringify(['opt2'])
        ]);

        // Code snippet update for Q3
        await pool.query(`
          UPDATE assessment_questions SET code_snippet = 'for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 10);\n}' WHERE assessment_id = ? AND question_type = 'output_based'
        `, [assId1]);

        // Questions for Section 2 (Link to existing problems: Two Sum (ID 1) & Valid Parentheses (ID 7))
        const [probTwoSum] = await pool.query("SELECT id FROM problems WHERE title = 'Two Sum' LIMIT 1;");
        const [probParentheses] = await pool.query("SELECT id FROM problems WHERE title = 'Valid Parentheses' LIMIT 1;");

        const twoSumId = probTwoSum[0]?.id || 1;
        const parenthesesId = probParentheses[0]?.id || 7;

        await pool.query(`
          INSERT INTO assessment_questions (assessment_id, section_id, question_type, problem_id, question_text, marks, negative_marks, order_index)
          VALUES 
          (?, ?, 'coding', ?, 'Solve Two Sum: Find indices of two numbers in an array that add up to target.', 10.00, 0.00, 4),
          (?, ?, 'coding', ?, 'Solve Valid Parentheses: Determine if an input string of brackets is valid and properly nested.', 10.00, 0.00, 5)
        `, [assId1, secId2, twoSumId, assId1, secId2, parenthesesId]);

        // 2. Practice MCQ & Coding Assessment
        const [ass2] = await pool.query(`
          INSERT INTO assessments (
            slug, title, description, assessment_type, difficulty, category, 
            duration_minutes, passing_score_percentage, default_positive_marks, default_negative_marks,
            attempt_limit, random_question_order, random_option_order, visibility,
            instructions, rules, status
          ) VALUES (
            'frontend-react-js-screening',
            'Frontend React & Modern JavaScript Technical Exam',
            'Screening assessment for prospective frontend engineers focused on ES6+, React Hooks, and Array manipulation algorithms.',
            'Coding', 'Easy', 'Frontend Engineering',
            45, 50.00, 5.00, 1.00,
            3, 1, 1, 'PUBLIC',
            'Take your time to read each question carefully. You can test your code using the built-in online compiler.',
            'Standard CodeArena assessment terms apply.',
            'PUBLISHED'
          )
        `);
        const assId2 = ass2.insertId;

        const [sec2_1] = await pool.query(`
          INSERT INTO assessment_sections (assessment_id, title, description, order_index)
          VALUES (?, 'Coding Section', 'Complete the requested algorithm challenge.', 1)
        `, [assId2]);

        const [probRevString] = await pool.query("SELECT id FROM problems WHERE title = 'Reverse String' LIMIT 1;");
        const revStringId = probRevString[0]?.id || 2;

        await pool.query(`
          INSERT INTO assessment_questions (assessment_id, section_id, question_type, problem_id, question_text, marks, negative_marks, order_index)
          VALUES (?, ?, 'coding', ?, 'Reverse String: Reverse an array/string in place.', 20.00, 0.00, 1)
        `, [assId2, sec2_1.insertId, revStringId]);

        console.log("Successfully seeded 2 demo CodeArena Assessments!");
      }
    } catch (assErr) {
      console.warn("Could not verify/seed Assessment System tables:", assErr.message);
    }

    // 3.1f Ensure Course System tables exist and seed 5 sample courses if empty
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS courses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          slug VARCHAR(255) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL,
          short_description TEXT,
          full_description LONGTEXT,
          thumbnail_url VARCHAR(500),
          category VARCHAR(100) DEFAULT 'Programming',
          difficulty ENUM('Beginner', 'Intermediate', 'Advanced') DEFAULT 'Beginner',
          estimated_duration_hours VARCHAR(50) DEFAULT '10 Hours',
          learning_objectives TEXT,
          prerequisites TEXT,
          status ENUM('DRAFT', 'PUBLISHED', 'UNPUBLISHED') DEFAULT 'PUBLISHED',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS course_modules (
          id INT AUTO_INCREMENT PRIMARY KEY,
          course_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          order_index INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS course_lessons (
          id INT AUTO_INCREMENT PRIMARY KEY,
          module_id INT NOT NULL,
          course_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          content LONGTEXT NOT NULL,
          code_snippet LONGTEXT,
          notes TEXT,
          estimated_minutes INT DEFAULT 15,
          is_required TINYINT(1) DEFAULT 1,
          order_index INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
          FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS course_enrollments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          course_id INT NOT NULL,
          status ENUM('ENROLLED', 'IN_PROGRESS', 'COMPLETED') DEFAULT 'ENROLLED',
          enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          completed_at TIMESTAMP NULL DEFAULT NULL,
          UNIQUE KEY user_course_unique (user_id, course_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS course_progress (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          course_id INT NOT NULL,
          lesson_id INT NOT NULL,
          completed TINYINT(1) DEFAULT 1,
          completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY user_lesson_unique (user_id, lesson_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
          FOREIGN KEY (lesson_id) REFERENCES course_lessons(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS course_certificates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          course_id INT NOT NULL,
          verification_code VARCHAR(100) UNIQUE NOT NULL,
          user_name VARCHAR(255) NOT NULL,
          course_name VARCHAR(255) NOT NULL,
          completion_date VARCHAR(100) NOT NULL,
          completion_time VARCHAR(100) NOT NULL,
          qr_data TEXT,
          issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY user_course_cert_unique (user_id, course_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `);

      const [courseCount] = await pool.query("SELECT COUNT(*) as count FROM courses;");
      if (courseCount[0].count === 0) {
        console.log("Seeding 5 initial CodeArena sample courses...");

        const sampleCourses = [
          {
            slug: 'basic-c-programming',
            title: 'Basic C Programming',
            short_description: 'Master procedural programming fundamentals, memory management, pointers, and essential algorithms in C.',
            full_description: 'C is the foundation of modern computer programming. In this course, you will learn structured programming, memory layout, variables, control flow, functions, pointers, dynamic memory allocation, and array/string manipulation.',
            thumbnail_url: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=600&q=80',
            category: 'C Programming',
            difficulty: 'Beginner',
            estimated_duration_hours: '8 Hours',
            learning_objectives: 'Understand C compilation workflow; Master variables, data types, and operators; Implement loops and logic control; Write functions and manage variable scopes; Master pointers and array memory allocation.',
            prerequisites: 'No prior coding experience required.',
            status: 'PUBLISHED',
            modules: [
              {
                title: 'Module 1: Introduction & Fundamentals',
                description: 'Get started with C programming environment, main function structure, compilation, and basic output.',
                lessons: [
                  {
                    title: 'Lesson 1: Introduction to C & Environment Setup',
                    content: 'C is a powerful procedural language created by Dennis Ritchie at Bell Labs. In C, code execution starts at the main() function. Programs are compiled into executable machine instructions using compilers like GCC or Clang.',
                    code_snippet: '#include <stdio.h>\n\nint main() {\n    printf("Welcome to CodeArena C Programming!\\n");\n    return 0;\n}',
                    notes: 'Always end statements with a semicolon (;) in C.'
                  },
                  {
                    title: 'Lesson 2: Variables, Data Types & Formatting',
                    content: 'C supports primitive data types including int (integers), float & double (floating-point decimal numbers), and char (single ASCII characters). Use printf with format specifiers like %d for integers, %f for floats, and %c for chars.',
                    code_snippet: '#include <stdio.h>\n\nint main() {\n    int age = 22;\n    float gpa = 3.85;\n    char grade = \'A\';\n\n    printf("Age: %d, GPA: %.2f, Grade: %c\\n", age, gpa, grade);\n    return 0;\n}',
                    notes: 'Format specifiers tell printf how to interpret memory bytes.'
                  }
                ]
              },
              {
                title: 'Module 2: Control Flow & Logic',
                description: 'Learn conditional branching (if/else, switch) and repetition constructs (for, while, do-while).',
                lessons: [
                  {
                    title: 'Lesson 1: Conditional Statements (if, else if, switch)',
                    content: 'Conditionals allow programs to execute specific code blocks depending on expressions evaluating to true (non-zero) or false (zero).',
                    code_snippet: '#include <stdio.h>\n\nint main() {\n    int score = 85;\n    if (score >= 90) {\n        printf("Grade: A\\n");\n    } else if (score >= 80) {\n        printf("Grade: B\\n");\n    } else {\n        printf("Grade: C\\n");\n    }\n    return 0;\n}',
                    notes: 'In C, 0 means false and any non-zero value represents true.'
                  },
                  {
                    title: 'Lesson 2: Loops & Iteration (for, while)',
                    content: 'Loops repeat code execution. A for loop is ideal when the iteration count is known, while a while loop repeats as long as a condition remains true.',
                    code_snippet: '#include <stdio.h>\n\nint main() {\n    // For loop\n    for (int i = 1; i <= 5; i++) {\n        printf("Count: %d\\n", i);\n    }\n    return 0;\n}',
                    notes: 'Be careful to avoid infinite loops by ensuring the loop condition eventually turns false.'
                  }
                ]
              },
              {
                title: 'Module 3: Functions, Arrays & Pointers',
                description: 'Decompose software into modular functions, work with arrays, and master C pointers.',
                lessons: [
                  {
                    title: 'Lesson 1: User-Defined Functions',
                    content: 'Functions allow reusable code blocks. In C, functions require a return type, parameter list, and function body.',
                    code_snippet: '#include <stdio.h>\n\nint addNumbers(int a, int b) {\n    return a + b;\n}\n\nint main() {\n    int sum = addNumbers(12, 28);\n    printf("Sum: %d\\n", sum);\n    return 0;\n}',
                    notes: 'Declare function prototypes at the top if defined below main.'
                  },
                  {
                    title: 'Lesson 2: Arrays, Strings & Pointers',
                    content: 'An array stores contiguous elements of the same data type. A pointer is a variable holding the memory address of another variable (& address-of, * dereference).',
                    code_snippet: '#include <stdio.h>\n\nint main() {\n    int val = 42;\n    int *ptr = &val;\n    printf("Value: %d, Address: %p\\n", *ptr, (void*)ptr);\n    return 0;\n}',
                    notes: 'Strings in C are null-terminated character arrays (\'\\0\').'
                  }
                ]
              }
            ]
          },
          {
            slug: 'cpp-programming-fundamentals',
            title: 'C++ Programming Fundamentals',
            short_description: 'Explore C++ Object-Oriented Programming (OOP), STL containers, templates, and memory management.',
            full_description: 'C++ builds upon C with powerful Object-Oriented Programming principles, rich Standard Template Library (STL) utilities, generic templates, and high-performance system programming capabilities.',
            thumbnail_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80',
            category: 'C++ Programming',
            difficulty: 'Beginner',
            estimated_duration_hours: '10 Hours',
            learning_objectives: 'Understand C++ I/O streams and namespaces; Learn OOP (Classes, Encapsulation, Inheritance, Polymorphism); Master STL vector, map, and set algorithms.',
            prerequisites: 'Basic knowledge of programming logic helpful.',
            status: 'PUBLISHED',
            modules: [
              {
                title: 'Module 1: C++ Basics & I/O Streams',
                description: 'Transition to std::cin, std::cout, std::string, and modern namespaces.',
                lessons: [
                  {
                    title: 'Lesson 1: Hello C++ World & Streams',
                    content: 'C++ uses <iostream> stream objects std::cout (output) and std::cin (input) along with stream insertion/extraction operators (<< and >>).',
                    code_snippet: '#include <iostream>\n#include <string>\n\nint main() {\n    std::string name;\n    std::cout << "Enter your name: ";\n    std::cin >> name;\n    std::cout << "Hello, " << name << "! Welcome to C++.\\n";\n    return 0;\n}',
                    notes: 'using namespace std; can simplify code in small programs.'
                  }
                ]
              },
              {
                title: 'Module 2: Object-Oriented Programming (OOP)',
                description: 'Construct Classes, Constructors, Destructors, Encapsulation, and Inheritance.',
                lessons: [
                  {
                    title: 'Lesson 1: Classes & Encapsulation',
                    content: 'A class defines custom object blueprints combining data attributes (private) and member methods (public).',
                    code_snippet: '#include <iostream>\n#include <string>\n\nclass Student {\nprivate:\n    std::string name;\n    int score;\npublic:\n    Student(std::string n, int s) : name(n), score(s) {}\n    void display() {\n        std::cout << "Student: " << name << " | Score: " << score << "\\n";\n    }\n};\n\nint main() {\n    Student s1("Alex", 95);\n    s1.display();\n    return 0;\n}',
                    notes: 'Constructors initialize object state upon instantiation.'
                  },
                  {
                    title: 'Lesson 2: Standard Template Library (STL)',
                    content: 'STL provides production-ready dynamic containers such as std::vector, std::unordered_map, and algorithm utilities.',
                    code_snippet: '#include <iostream>\n#include <vector>\n#include <algorithm>\n\nint main() {\n    std::vector<int> nums = {5, 2, 9, 1, 7};\n    std::sort(nums.begin(), nums.end());\n    std::cout << "Sorted numbers: ";\n    for (int n : nums) std::cout << n << " ";\n    std::cout << "\\n";\n    return 0;\n}',
                    notes: 'std::vector handles dynamic resizing automatically.'
                  }
                ]
              }
            ]
          },
          {
            slug: 'java-programming-fundamentals',
            title: 'Java Programming Fundamentals',
            short_description: 'Master Object-Oriented Java development, JVM execution, classes, inheritance, interfaces, and collections.',
            full_description: 'Java is a robust, cross-platform, object-oriented programming language designed to write once and run anywhere (WORA) on the Java Virtual Machine (JVM).',
            thumbnail_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
            category: 'Java Programming',
            difficulty: 'Beginner',
            estimated_duration_hours: '12 Hours',
            learning_objectives: 'Understand JVM & JDK ecosystem; Write clean Java classes and interfaces; Master Java Collections Framework (ArrayList, HashMap); Handle exceptions safely.',
            prerequisites: 'None.',
            status: 'PUBLISHED',
            modules: [
              {
                title: 'Module 1: Java Core & Syntax',
                description: 'Understand JDK, main class structure, System.out.println, primitives, and Strings.',
                lessons: [
                  {
                    title: 'Lesson 1: Java Program Architecture',
                    content: 'In Java, all code must reside inside a class. The public static void main(String[] args) method serves as the entry point.',
                    code_snippet: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello CodeArena Java Developer!");\n    }\n}',
                    notes: 'File name must match the public class name (Main.java).'
                  },
                  {
                    title: 'Lesson 2: Java Collections & ArrayList',
                    content: 'The Java Collections Framework includes dynamic lists, sets, and maps. ArrayList provides resizable array implementation.',
                    code_snippet: 'import java.util.ArrayList;\n\npublic class Main {\n    public static void main(String[] args) {\n        ArrayList<String> languages = new ArrayList<>();\n        languages.add("Java");\n        languages.add("Python");\n        languages.add("JavaScript");\n        \n        for (String lang : languages) {\n            System.out.println("Language: " + lang);\n        }\n    }\n}',
                    notes: 'Use generics <String> for type safety.'
                  }
                ]
              }
            ]
          },
          {
            slug: 'python-programming-fundamentals',
            title: 'Python Programming Fundamentals',
            short_description: 'Learn clean, readable Python code, data structures (lists, tuples, dicts), functions, and automation basics.',
            full_description: 'Python is a modern, high-level, interpreted programming language renowned for its expressive syntax, readability, and vast ecosystem in software development, data science, and automation.',
            thumbnail_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
            category: 'Python Programming',
            difficulty: 'Beginner',
            estimated_duration_hours: '8 Hours',
            learning_objectives: 'Master Python indentation and clean syntax; Work with lists, dictionaries, tuples, and sets; Build modular functions and list comprehensions; Handle file I/O and modules.',
            prerequisites: 'None.',
            status: 'PUBLISHED',
            modules: [
              {
                title: 'Module 1: Python Essentials',
                description: 'Variables, dynamic typing, print statements, and formatted f-strings.',
                lessons: [
                  {
                    title: 'Lesson 1: Python Basics & Clean Code',
                    content: 'Python relies on indentation (whitespace) instead of curly braces to demarcate code blocks.',
                    code_snippet: 'name = "CodeArena"\nuser_count = 1500\nprint(f"Platform: {name} | Active Coders: {user_count}")',
                    notes: 'Python uses snake_case for variable names.'
                  },
                  {
                    title: 'Lesson 2: Lists, Dicts & Comprehensions',
                    content: 'Python features built-in data structures including lists [], dictionaries {}, and set operations, enhanced by elegant list comprehensions.',
                    code_snippet: '# List comprehension\nnumbers = [1, 2, 3, 4, 5, 6]\nevens = [x * 2 for x in numbers if x % 2 == 0]\nprint("Evens multiplied:", evens)',
                    notes: 'List comprehensions provide concise syntax for creating lists.'
                  }
                ]
              }
            ]
          },
          {
            slug: 'javascript-fundamentals',
            title: 'JavaScript Fundamentals',
            short_description: 'Master modern ES6+ JavaScript, functions, DOM manipulation concepts, async/await, and promises.',
            full_description: 'JavaScript is the core programming language of the web. Learn modern ES6+ syntax, arrow functions, destructuring, promises, and async operations.',
            thumbnail_url: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?auto=format&fit=crop&w=600&q=80',
            category: 'Web Development',
            difficulty: 'Beginner',
            estimated_duration_hours: '10 Hours',
            learning_objectives: 'Master let, const, arrow functions, and scoping; Use array methods (map, filter, reduce); Understand Promises and Async/Await.',
            prerequisites: 'Basic HTML understanding helpful.',
            status: 'PUBLISHED',
            modules: [
              {
                title: 'Module 1: ES6+ Essentials',
                description: 'Variables, arrow functions, template literals, and array methods.',
                lessons: [
                  {
                    title: 'Lesson 1: Modern JS Syntax (let, const, Arrow Functions)',
                    content: 'Use const by default for immutable bindings and let for reassignable variables. Arrow functions provide concise syntax.',
                    code_snippet: 'const calculateArea = (width, height) => width * height;\nconsole.log(`Area: ${calculateArea(10, 5)} sq units`);',
                    notes: 'Avoid var in modern JavaScript development.'
                  },
                  {
                    title: 'Lesson 2: Async/Await & Promises',
                    content: 'Asynchronous JavaScript allows non-blocking execution using Promises and clean async/await syntax.',
                    code_snippet: 'const fetchData = async () => {\n  try {\n    const response = await fetch("https://api.github.com/users/octocat");\n    const data = await response.json();\n    console.log("GitHub User:", data.name);\n  } catch (err) {\n    console.error("Fetch failed:", err);\n  }\n};\nfetchData();',
                    notes: 'Always wrap await calls in try/catch blocks.'
                  }
                ]
              }
            ]
          }
        ];

        for (const c of sampleCourses) {
          const [cRes] = await pool.query(`
            INSERT INTO courses (slug, title, short_description, full_description, thumbnail_url, category, difficulty, estimated_duration_hours, learning_objectives, prerequisites, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [c.slug, c.title, c.short_description, c.full_description, c.thumbnail_url, c.category, c.difficulty, c.estimated_duration_hours, c.learning_objectives, c.prerequisites, c.status]);

          const courseId = cRes.insertId;

          let modOrder = 1;
          for (const m of c.modules) {
            const [mRes] = await pool.query(`
              INSERT INTO course_modules (course_id, title, description, order_index)
              VALUES (?, ?, ?, ?)
            `, [courseId, m.title, m.description, modOrder++]);

            const moduleId = mRes.insertId;

            let lesOrder = 1;
            for (const l of m.lessons) {
              await pool.query(`
                INSERT INTO course_lessons (module_id, course_id, title, content, code_snippet, notes, estimated_minutes, is_required, order_index)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
              `, [moduleId, courseId, l.title, l.content, l.code_snippet || null, l.notes || null, 15, lesOrder++]);
            }
          }
        }
        console.log("Successfully seeded 5 initial CodeArena sample courses!");
      }
    } catch (courseDbErr) {
      console.warn("Could not verify/seed Course System tables:", courseDbErr.message);
    }


    // 3.1g Organization table migrations - add new columns and tables
    try {
      const [orgCols] = await pool.query("SHOW COLUMNS FROM organization_profiles;");
      const orgColNames = orgCols.map(c => c.Field);
      const newOrgCols = [
        ['reg_number', "ALTER TABLE organization_profiles ADD COLUMN reg_number VARCHAR(100) DEFAULT NULL"],
        ['pan_number', "ALTER TABLE organization_profiles ADD COLUMN pan_number VARCHAR(50) DEFAULT NULL"],
        ['rep_name', "ALTER TABLE organization_profiles ADD COLUMN rep_name VARCHAR(255) DEFAULT NULL"],
        ['rep_designation', "ALTER TABLE organization_profiles ADD COLUMN rep_designation VARCHAR(100) DEFAULT NULL"],
        ['suspension_reason', "ALTER TABLE organization_profiles ADD COLUMN suspension_reason TEXT DEFAULT NULL"],
        ['logo_url', "ALTER TABLE organization_profiles ADD COLUMN logo_url VARCHAR(500) DEFAULT NULL"],
        ['description', "ALTER TABLE organization_profiles ADD COLUMN description TEXT DEFAULT NULL"],
        ['established_year', "ALTER TABLE organization_profiles ADD COLUMN established_year INT DEFAULT NULL"],
        ['industry', "ALTER TABLE organization_profiles ADD COLUMN industry VARCHAR(100) DEFAULT NULL"],
        ['employee_count', "ALTER TABLE organization_profiles ADD COLUMN employee_count VARCHAR(50) DEFAULT NULL"],
        ['contact_person', "ALTER TABLE organization_profiles ADD COLUMN contact_person VARCHAR(255) DEFAULT NULL"],
        ['contact_designation', "ALTER TABLE organization_profiles ADD COLUMN contact_designation VARCHAR(100) DEFAULT NULL"],
        ['twitter_url', "ALTER TABLE organization_profiles ADD COLUMN twitter_url VARCHAR(255) DEFAULT NULL"],
        ['linkedin_url', "ALTER TABLE organization_profiles ADD COLUMN linkedin_url VARCHAR(255) DEFAULT NULL"]
      ];
      for (const [colName, sql] of newOrgCols) {
        if (!orgColNames.includes(colName)) {
          await pool.query(sql);
          console.log(`Added '${colName}' column to organization_profiles.`);
        }
      }
      // Expand verification_status ENUM
      await pool.query("ALTER TABLE organization_profiles MODIFY COLUMN verification_status ENUM('PENDING','UNDER_REVIEW','VERIFIED','REJECTED','SUSPENDED','RESUBMISSION_REQUIRED') DEFAULT 'PENDING'");
      console.log("Verified organization_profiles ENUM statuses updated.");
    } catch (orgMigErr) {
      console.warn("Org profile migration:", orgMigErr.message);
    }

    // 3.1h Create organization_audit_logs table
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS organization_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        org_profile_id INT NOT NULL,
        action VARCHAR(100) NOT NULL,
        admin_id INT NOT NULL,
        reason TEXT,
        previous_status VARCHAR(50),
        new_status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (org_profile_id) REFERENCES organization_profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`);
      console.log("Verified 'organization_audit_logs' table exists.");
    } catch (e) { console.warn("organization_audit_logs:", e.message); }

    // 3.1h2 Create email_logs and user_notification_preferences tables
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS email_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        org_profile_id INT NULL,
        email_type VARCHAR(100) NOT NULL,
        recipient_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        provider_message_id VARCHAR(255) NULL,
        status ENUM('SENT', 'DELIVERED', 'BOUNCED', 'FAILED', 'SUPPRESSED') NOT NULL DEFAULT 'SENT',
        error_message TEXT DEFAULT NULL,
        event_key VARCHAR(255) DEFAULT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email_recipient (recipient_email),
        INDEX idx_event_key (event_key),
        INDEX idx_provider_msg (provider_message_id)
      ) ENGINE=InnoDB`);

      await pool.query(`CREATE TABLE IF NOT EXISTS user_notification_preferences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE NOT NULL,
        email_notifications_enabled TINYINT(1) DEFAULT 1,
        marketing_emails_enabled TINYINT(1) DEFAULT 1,
        assessment_updates_enabled TINYINT(1) DEFAULT 1,
        contest_updates_enabled TINYINT(1) DEFAULT 1,
        course_updates_enabled TINYINT(1) DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`);

      await pool.query(`CREATE TABLE IF NOT EXISTS organization_email_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        org_profile_id INT NOT NULL,
        email_type VARCHAR(100) NOT NULL,
        recipient_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        verification_status VARCHAR(50) NOT NULL,
        status ENUM('SENT', 'FAILED') NOT NULL DEFAULT 'SENT',
        error_message TEXT DEFAULT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`);
      console.log("Verified 'email_logs', 'user_notification_preferences', and 'organization_email_logs' tables exist.");
    } catch (e) { console.warn("email_logs:", e.message); }

    // 3.1h3 Create organization_documents table
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS organization_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        org_profile_id INT NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        document_type VARCHAR(100) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size VARCHAR(50) DEFAULT NULL,
        file_type VARCHAR(50) DEFAULT NULL,
        verification_status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
        rejection_reason TEXT DEFAULT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (org_profile_id) REFERENCES organization_profiles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`);
      console.log("Verified 'organization_documents' table exists.");
    } catch (e) { console.warn("organization_documents:", e.message); }

    // 3.1h4 Create organization_notifications table
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS organization_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        org_profile_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (org_profile_id) REFERENCES organization_profiles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`);
      console.log("Verified 'organization_notifications' table exists.");
    } catch (e) { console.warn("organization_notifications:", e.message); }

    // 3.1i Create & Upgrade contests tables
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS contests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        short_description VARCHAR(500) NULL,
        description TEXT,
        instructions TEXT,
        banner_url VARCHAR(500) NULL,
        contest_type ENUM('CODING','MCQ','MIXED') DEFAULT 'CODING',
        difficulty ENUM('Beginner','Easy','Medium','Hard','Advanced') DEFAULT 'Medium',
        organizer_type ENUM('ADMIN','ORGANIZATION') DEFAULT 'ADMIN',
        organizer_id INT NULL,
        created_by INT NOT NULL,
        status ENUM('DRAFT','SCHEDULED','REGISTRATION_OPEN','LIVE','COMPLETED','CANCELLED','ARCHIVED') DEFAULT 'DRAFT',
        visibility ENUM('PUBLIC','PRIVATE') DEFAULT 'PUBLIC',
        access_code VARCHAR(50) NULL,
        registration_required TINYINT(1) DEFAULT 1,
        registration_start DATETIME NULL,
        registration_deadline DATETIME NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        duration_minutes INT NOT NULL DEFAULT 120,
        max_participants INT DEFAULT 0,
        negative_marking TINYINT(1) DEFAULT 0,
        negative_marks_per_wrong DECIMAL(5,2) DEFAULT 0.00,
        time_penalty_per_wrong_min INT DEFAULT 10,
        max_submissions_per_problem INT DEFAULT 0,
        allowed_languages JSON DEFAULT NULL,
        leaderboard_enabled TINYINT(1) DEFAULT 1,
        leaderboard_frozen TINYINT(1) DEFAULT 0,
        certificate_enabled TINYINT(1) DEFAULT 0,
        security_enabled TINYINT(1) DEFAULT 1,
        security_config JSON DEFAULT NULL,
        scoring_rules JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`);
      
      // Upgrade columns on contests if table existed previously
      const [cCols] = await pool.query("SHOW COLUMNS FROM contests;");
      const cColNames = cCols.map(c => c.Field);
      if (!cColNames.includes('short_description')) await pool.query("ALTER TABLE contests ADD COLUMN short_description VARCHAR(500) NULL;");
      if (!cColNames.includes('instructions')) await pool.query("ALTER TABLE contests ADD COLUMN instructions TEXT NULL;");
      if (!cColNames.includes('banner_url')) await pool.query("ALTER TABLE contests ADD COLUMN banner_url VARCHAR(500) NULL;");
      if (!cColNames.includes('contest_type')) await pool.query("ALTER TABLE contests ADD COLUMN contest_type ENUM('CODING','MCQ','MIXED') DEFAULT 'CODING';");
      if (!cColNames.includes('difficulty')) await pool.query("ALTER TABLE contests ADD COLUMN difficulty ENUM('Beginner','Easy','Medium','Hard','Advanced') DEFAULT 'Medium';");
      if (!cColNames.includes('organizer_type')) await pool.query("ALTER TABLE contests ADD COLUMN organizer_type ENUM('ADMIN','ORGANIZATION') DEFAULT 'ADMIN';");
      if (!cColNames.includes('organizer_id')) await pool.query("ALTER TABLE contests ADD COLUMN organizer_id INT NULL;");
      if (!cColNames.includes('access_code')) await pool.query("ALTER TABLE contests ADD COLUMN access_code VARCHAR(50) NULL;");
      if (!cColNames.includes('registration_required')) await pool.query("ALTER TABLE contests ADD COLUMN registration_required TINYINT(1) DEFAULT 1;");
      if (!cColNames.includes('registration_start')) await pool.query("ALTER TABLE contests ADD COLUMN registration_start DATETIME NULL;");
      if (!cColNames.includes('negative_marking')) await pool.query("ALTER TABLE contests ADD COLUMN negative_marking TINYINT(1) DEFAULT 0;");
      if (!cColNames.includes('negative_marks_per_wrong')) await pool.query("ALTER TABLE contests ADD COLUMN negative_marks_per_wrong DECIMAL(5,2) DEFAULT 0.00;");
      if (!cColNames.includes('time_penalty_per_wrong_min')) await pool.query("ALTER TABLE contests ADD COLUMN time_penalty_per_wrong_min INT DEFAULT 10;");
      if (!cColNames.includes('max_submissions_per_problem')) await pool.query("ALTER TABLE contests ADD COLUMN max_submissions_per_problem INT DEFAULT 0;");
      if (!cColNames.includes('leaderboard_enabled')) await pool.query("ALTER TABLE contests ADD COLUMN leaderboard_enabled TINYINT(1) DEFAULT 1;");
      if (!cColNames.includes('leaderboard_frozen')) await pool.query("ALTER TABLE contests ADD COLUMN leaderboard_frozen TINYINT(1) DEFAULT 0;");
      if (!cColNames.includes('certificate_enabled')) await pool.query("ALTER TABLE contests ADD COLUMN certificate_enabled TINYINT(1) DEFAULT 0;");
      if (!cColNames.includes('security_enabled')) await pool.query("ALTER TABLE contests ADD COLUMN security_enabled TINYINT(1) DEFAULT 1;");
      if (!cColNames.includes('security_config')) await pool.query("ALTER TABLE contests ADD COLUMN security_config JSON DEFAULT NULL;");
      if (!cColNames.includes('scoring_rules')) await pool.query("ALTER TABLE contests ADD COLUMN scoring_rules JSON DEFAULT NULL;");

      // Expand status ENUM and ensure organization_id is NULLable if present
      try {
        if (cColNames.includes('organization_id')) {
          await pool.query("ALTER TABLE contests MODIFY COLUMN organization_id INT NULL DEFAULT NULL;");
        }
        await pool.query("ALTER TABLE contests MODIFY COLUMN status ENUM('DRAFT','SCHEDULED','REGISTRATION_OPEN','LIVE','COMPLETED','CANCELLED','ARCHIVED') DEFAULT 'DRAFT';");
      } catch (enumErr) {}

      console.log("Verified 'contests' table and full schema columns exist.");
    } catch (e) { console.warn("contests schema migration:", e.message); }

    // 3.1j Create contest_problems table
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS contest_problems (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contest_id INT NOT NULL,
        problem_id INT NOT NULL,
        order_index INT DEFAULT 1,
        points INT DEFAULT 100,
        negative_marks DECIMAL(5,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_contest_problem (contest_id, problem_id),
        FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
        FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`);
      console.log("Verified 'contest_problems' table exists.");
    } catch (e) { console.warn("contest_problems:", e.message); }

    // 3.1k Create contest_registrations table
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS contest_registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contest_id INT NOT NULL,
        user_id INT NOT NULL,
        status ENUM('REGISTERED','CANCELLED','PARTICIPATED','DISQUALIFIED') DEFAULT 'REGISTERED',
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        cancelled_at DATETIME NULL,
        UNIQUE KEY unique_contest_registration (contest_id, user_id),
        FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`);
      console.log("Verified 'contest_registrations' table exists.");
    } catch (e) { console.warn("contest_registrations:", e.message); }

    // 3.1l Create contest_attempts table
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS contest_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contest_id INT NOT NULL,
        user_id INT NOT NULL,
        started_at DATETIME NOT NULL,
        expires_at DATETIME NOT NULL,
        submitted_at DATETIME NULL,
        status ENUM('IN_PROGRESS','SUBMITTED','AUTO_SUBMITTED','EXPIRED','DISQUALIFIED') DEFAULT 'IN_PROGRESS',
        score DECIMAL(8,2) DEFAULT 0.00,
        penalty_minutes INT DEFAULT 0,
        solved_count INT DEFAULT 0,
        rank_position INT NULL,
        warning_count INT DEFAULT 0,
        termination_reason VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_contest_attempt (contest_id, user_id),
        FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`);
      console.log("Verified 'contest_attempts' table exists.");
    } catch (e) { console.warn("contest_attempts:", e.message); }

    // 3.1m Create contest_submissions table
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS contest_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contest_id INT NOT NULL,
        attempt_id INT NOT NULL,
        user_id INT NOT NULL,
        problem_id INT NOT NULL,
        language VARCHAR(50) NOT NULL,
        source_code TEXT NOT NULL,
        status ENUM('PENDING','RUNNING','ACCEPTED','WRONG_ANSWER','TIME_LIMIT','MEMORY_LIMIT','RUNTIME_ERROR','COMPILATION_ERROR','FAILED') DEFAULT 'PENDING',
        score DECIMAL(8,2) DEFAULT 0.00,
        test_cases_passed INT DEFAULT 0,
        total_test_cases INT DEFAULT 0,
        execution_time_ms INT DEFAULT 0,
        memory_kb INT DEFAULT 0,
        submission_number INT DEFAULT 1,
        penalty_applied INT DEFAULT 0,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
        FOREIGN KEY (attempt_id) REFERENCES contest_attempts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`);
      console.log("Verified 'contest_submissions' table exists.");
    } catch (e) { console.warn("contest_submissions:", e.message); }

    // 3.1n Create contest_security_events table
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS contest_security_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contest_id INT NOT NULL,
        attempt_id INT NOT NULL,
        user_id INT NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        warning_number INT DEFAULT 0,
        metadata JSON NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
        FOREIGN KEY (attempt_id) REFERENCES contest_attempts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`);
      console.log("Verified 'contest_security_events' table exists.");
    } catch (e) { console.warn("contest_security_events:", e.message); }

    // 3.1o Create contest_certificates table
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS contest_certificates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contest_id INT NOT NULL,
        user_id INT NOT NULL,
        certificate_code VARCHAR(100) UNIQUE NOT NULL,
        cert_type ENUM('PARTICIPATION','COMPLETION','WINNER') DEFAULT 'PARTICIPATION',
        rank_position INT NULL,
        score DECIMAL(8,2) DEFAULT 0.00,
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`);
      console.log("Verified 'contest_certificates' table exists.");
    } catch (e) { console.warn("contest_certificates:", e.message); }

    // 3.1p Create contest_results table
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS contest_results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contest_id INT NOT NULL,
        user_id INT NOT NULL,
        rank_position INT NOT NULL,
        score DECIMAL(8,2) DEFAULT 0.00,
        penalty_minutes INT DEFAULT 0,
        solved_count INT DEFAULT 0,
        completion_time_seconds INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_contest_user_result (contest_id, user_id),
        FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`);
      console.log("Verified 'contest_results' table exists.");
    } catch (e) { console.warn("contest_results:", e.message); }

    // 3.1q Create Support, Feedback, Rules & Guidelines, and FAQ System tables
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS support_tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_code VARCHAR(50) UNIQUE NOT NULL,
        user_id INT NOT NULL,
        org_id INT NULL,
        contest_id INT NULL,
        assessment_id INT NULL,
        problem_id INT NULL,
        category VARCHAR(100) NOT NULL DEFAULT 'General',
        subject VARCHAR(255) NOT NULL,
        priority VARCHAR(50) DEFAULT 'Medium',
        status ENUM('OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED') DEFAULT 'OPEN',
        assigned_to INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (org_id) REFERENCES organization_profiles(id) ON DELETE SET NULL,
        FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE SET NULL,
        FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE SET NULL,
        FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE SET NULL
      ) ENGINE=InnoDB`);

      await pool.query(`CREATE TABLE IF NOT EXISTS support_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        sender_id INT NOT NULL,
        sender_role ENUM('user', 'organization', 'admin') DEFAULT 'user',
        message TEXT NOT NULL,
        is_internal TINYINT(1) DEFAULT 0,
        attachment_url VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`);

      await pool.query(`CREATE TABLE IF NOT EXISTS user_feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        org_id INT NULL,
        contest_id INT NULL,
        assessment_id INT NULL,
        problem_id INT NULL,
        feedback_type VARCHAR(50) DEFAULT 'General',
        rating INT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        page_url VARCHAR(500) NULL,
        status ENUM('NEW', 'UNDER_REVIEW', 'ACTIONED', 'ARCHIVED') DEFAULT 'NEW',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (org_id) REFERENCES organization_profiles(id) ON DELETE SET NULL,
        FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE SET NULL,
        FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE SET NULL,
        FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE SET NULL
      ) ENGINE=InnoDB`);

      await pool.query(`CREATE TABLE IF NOT EXISTS faqs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(100) NOT NULL DEFAULT 'General',
        question VARCHAR(500) NOT NULL,
        answer TEXT NOT NULL,
        org_id INT NULL,
        display_order INT DEFAULT 1,
        is_published TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (org_id) REFERENCES organization_profiles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`);

      await pool.query(`CREATE TABLE IF NOT EXISTS contest_rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contest_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        rule_type VARCHAR(100) DEFAULT 'General',
        description TEXT NOT NULL,
        order_index INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`);

      await pool.query(`CREATE TABLE IF NOT EXISTS assessment_rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assessment_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        rule_type VARCHAR(100) DEFAULT 'General',
        description TEXT NOT NULL,
        order_index INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`);

      // Seed default platform FAQs if empty
      const [faqCount] = await pool.query("SELECT COUNT(*) as count FROM faqs;");
      if (faqCount[0].count === 0) {
        const defaultFaqs = [
          ['Contests', 'How do I register and participate in a coding contest?', 'Navigate to the Contest Hub from your sidebar, browse upcoming or live contests, click "Register", confirm your profile details, and click "Enter Contest" once the contest is live!'],
          ['Contests', 'What happens if I lose my internet connection during a contest?', 'Your progress and latest written code are saved continuously. When your connection restores, re-open the contest workspace to continue.'],
          ['Assessments', 'How does proctoring and security monitoring work?', 'Certain assessments and contests track tab switching, full-screen exits, and window blur events to preserve exam integrity. Warnings are issued for violations.'],
          ['Certificates', 'How can I verify or download my achievement certificates?', 'Visit the "Certificates & Achievements" section on your dashboard to download PDF certificates or share verification URLs.'],
          ['Account', 'How do I update my profile credentials or email notifications?', 'Open Settings from your top right user menu to edit your display name, bio, skills, and manage email preference options.']
        ];
        for (const [cat, q, a] of defaultFaqs) {
          await pool.query("INSERT INTO faqs (category, question, answer, is_published) VALUES (?, ?, ?, 1)", [cat, q, a]);
        }
      }

      console.log("Verified 'support_tickets', 'support_messages', 'user_feedback', 'faqs', 'contest_rules', & 'assessment_rules' tables exist.");
    } catch (sErr) {
      console.warn("Could not create Support & Rules tables:", sErr.message);
    }
    try {
      const [problemsCheck] = await pool.query("SELECT COUNT(*) as count FROM problems;");
      // Check if starter_code contains old solution code
      const [firstProb] = await pool.query("SELECT starter_code FROM problems LIMIT 1;");
      const hasOldSolution = firstProb.length > 0 && firstProb[0].starter_code && JSON.stringify(firstProb[0].starter_code).includes("const map = new Map();");

      if (problemsCheck[0].count < 20 || hasOldSolution) {
        console.log('Seeding/Updating challenges bank to essential problems with clean starter code & expanded test cases...');
        await pool.query("SET FOREIGN_KEY_CHECKS = 0;");
        await pool.query("TRUNCATE TABLE problems;");
        await pool.query("SET FOREIGN_KEY_CHECKS = 1;");
        
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          const schemaSql = fs.readFileSync(schemaPath, 'utf8');
          await pool.query(schemaSql);
          console.log('Database tables successfully initialized and seeded with 20 updated problems.');
        }
      }
    } catch (seedErr) {
      console.error('Error verifying/seeding 20 challenges:', seedErr.message);
    }

    // 4. Ensure default Demo accounts are seeded
    const [users] = await pool.query('SELECT * FROM users LIMIT 2');
    if (users.length === 0) {
      console.log('Seeding default demo users (admin and standard user)...');
      
      const salt = await bcrypt.genSalt(10);
      const adminHash = await bcrypt.hash('password123', salt);
      const userHash = await bcrypt.hash('password123', salt);

      await pool.query(
        `INSERT INTO users (username, email, password, role, solved_count, streak, xp, bio, github_profile, skills) VALUES 
         (?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
         (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'admin', 'admin@codearena.com', adminHash, 'admin', 5, 3, 450, 'CodeArena Admin', 'https://github.com/codearena', 'MySQL, Node.js, Express',
          'user', 'user@codearena.com', userHash, 'user', 2, 1, 150, 'Full Stack Developer', 'https://github.com/developer', 'JavaScript, React, SQL'
        ]
      );
      console.log('Seeded accounts successfully:');
      console.log(' - Admin Account -> admin / password123');
      console.log(' - User Account  -> user / password123');
    }

    // Seed initial demo contests if fewer than 5 contests exist
    try {
      const [contestCheck] = await pool.query("SELECT COUNT(*) as count FROM contests;");
      if (contestCheck[0].count < 5) {
        console.log('Seeding initial CodeArena Contests (including Organization contests)...');
        const [adminUser] = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1;");
        const adminId = adminUser.length > 0 ? adminUser[0].id : 1;

        // Ensure a verified test organization profile exists for org contest seeding
        let orgId = null;
        let orgUserId = null;
        const [orgRows] = await pool.query("SELECT id, user_id FROM organization_profiles LIMIT 1");
        if (orgRows.length > 0) {
          orgId = orgRows[0].id;
          orgUserId = orgRows[0].user_id;
        } else {
          // Seed an organization user and profile
          const salt = await bcrypt.genSalt(10);
          const orgPassHash = await bcrypt.hash('OrgTest@12345', salt);
          const [uRes] = await pool.query(
            `INSERT INTO users (username, email, password, display_name, role, activity_status)
             VALUES ('techcorp', 'contact@techcorp.io', ?, 'TechCorp Innovations', 'organization', 'online')`,
            [orgPassHash]
          );
          orgUserId = uRes.insertId;
          const [opRes] = await pool.query(
            `INSERT INTO organization_profiles (user_id, organization_name, organization_type, official_email, verification_status)
             VALUES (?, 'TechCorp Innovations', 'Private Limited', 'contact@techcorp.io', 'VERIFIED')`,
            [orgUserId]
          );
          orgId = opRes.insertId;
        }

        const now = new Date();
        const liveStart = new Date(now.getTime() - 60 * 60000); // 1 hr ago
        const liveEnd = new Date(now.getTime() + 180 * 60000); // 3 hrs from now
        
        const upcomingRegStart = new Date(now.getTime() - 24 * 3600000);
        const upcomingRegEnd = new Date(now.getTime() + 24 * 3600000);
        const upcomingStart = new Date(now.getTime() + 48 * 3600000);
        const upcomingEnd = new Date(now.getTime() + 51 * 3600000);

        const scheduledStart = new Date(now.getTime() + 7 * 86400000);
        const scheduledEnd = new Date(now.getTime() + 7 * 86400000 + 7200000);

        const completedStart = new Date(now.getTime() - 7 * 86400000);
        const completedEnd = new Date(now.getTime() - 7 * 86400000 + 7200000);

        // Delete existing low-count demo contests to re-seed a complete set cleanly if count < 5
        if (contestCheck[0].count > 0 && contestCheck[0].count < 5) {
          await pool.query("SET FOREIGN_KEY_CHECKS = 0;");
          await pool.query("TRUNCATE TABLE contests;");
          await pool.query("TRUNCATE TABLE contest_problems;");
          await pool.query("SET FOREIGN_KEY_CHECKS = 1;");
        }

        // Contest 1: Official Admin Contest (LIVE)
        const [res1] = await pool.query(
          `INSERT INTO contests (slug, title, short_description, description, instructions, banner_url, contest_type, difficulty, organizer_type, created_by, status, visibility, registration_required, registration_start, registration_deadline, start_time, end_time, duration_minutes, max_participants, negative_marking, negative_marks_per_wrong, leaderboard_enabled, security_enabled, allowed_languages)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'codearena-weekly-challenge-42',
            'CodeArena Weekly Challenge #42',
            'Test your algorithmic speed and precision across curated challenges.',
            'Welcome to CodeArena Weekly Challenge #42! Compete live with coders worldwide, solve dynamic programming and data structure problems, and climb the real-time global leaderboard.',
            '1. All code must be written in the contest IDE.\n2. 10 penalty minutes applied for each wrong submission.\n3. Tab switches are monitored.',
            'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
            'CODING', 'Medium', 'ADMIN', adminId, 'LIVE', 'PUBLIC', 1,
            liveStart, liveStart, liveStart, liveEnd, 120, 500, 1, 10.00, 1, 1,
            JSON.stringify(['javascript', 'python', 'cpp', 'java', 'c'])
          ]
        );

        // Contest 2: Org Contest (LIVE) - Hosted by TechCorp Innovations
        const [res2] = await pool.query(
          `INSERT INTO contests (slug, title, short_description, description, instructions, banner_url, contest_type, difficulty, organizer_type, organizer_id, created_by, status, visibility, registration_required, registration_start, registration_deadline, start_time, end_time, duration_minutes, max_participants, negative_marking, leaderboard_enabled, security_enabled, allowed_languages)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'techcorp-global-hackathon-2026',
            'TechCorp Global Coding Hackathon 2026',
            'Official screening contest hosted by TechCorp Innovations for engineering hires.',
            'TechCorp Innovations invites coders to showcase their algorithmic and problem-solving skills in this high-stakes 2-hour hiring hackathon.',
            '1. Open to all engineers.\n2. Submissions evaluated automatically.\n3. Top performers win direct interview referrals.',
            'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
            'CODING', 'Hard', 'ORGANIZATION', orgId, orgUserId, 'LIVE', 'PUBLIC', 1,
            liveStart, liveStart, liveStart, liveEnd, 120, 300, 1, 1, 1,
            JSON.stringify(['javascript', 'python', 'cpp', 'java'])
          ]
        );

        // Contest 3: Official Admin Contest (REGISTRATION OPEN)
        const [res3] = await pool.query(
          `INSERT INTO contests (slug, title, short_description, description, instructions, banner_url, contest_type, difficulty, organizer_type, created_by, status, visibility, registration_required, registration_start, registration_deadline, start_time, end_time, duration_minutes, max_participants, negative_marking, leaderboard_enabled, security_enabled, allowed_languages)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'grand-sprint-championship-2026',
            'Grand Sprint Championship 2026',
            'The premier 3-hour competitive programming championship on CodeArena.',
            'The annual Grand Sprint Championship brings together top engineers and competitive programmers. Solve challenging problems ranging from Medium to Advanced difficulty.',
            '1. Registrations close 1 hour before start.\n2. Plagiarism checks enforced.\n3. Digital certificates awarded to Top 10%.',
            'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
            'CODING', 'Hard', 'ADMIN', adminId, 'REGISTRATION_OPEN', 'PUBLIC', 1,
            upcomingRegStart, upcomingRegEnd, upcomingStart, upcomingEnd, 180, 1000, 1, 1, 1,
            JSON.stringify(['javascript', 'python', 'cpp', 'java', 'c'])
          ]
        );

        // Contest 4: Org Contest (SCHEDULED) - Hosted by TechCorp Innovations
        const [res4] = await pool.query(
          `INSERT INTO contests (slug, title, short_description, description, instructions, banner_url, contest_type, difficulty, organizer_type, organizer_id, created_by, status, visibility, registration_required, registration_start, registration_deadline, start_time, end_time, duration_minutes, max_participants, negative_marking, leaderboard_enabled, security_enabled, allowed_languages)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'techcorp-cloud-algo-sprint',
            'TechCorp Cloud Algorithms Sprint',
            'An upcoming specialized algorithmic challenge focused on data structures and backend logic.',
            'Join TechCorp Innovations for an intensive speed sprint testing core computer science concepts.',
            '1. Registrations open 24 hours prior to launch.\n2. 90-minute fast sprint.',
            'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
            'CODING', 'Medium', 'ORGANIZATION', orgId, orgUserId, 'SCHEDULED', 'PUBLIC', 1,
            upcomingRegStart, upcomingRegEnd, scheduledStart, scheduledEnd, 90, 250, 0, 1, 1,
            JSON.stringify(['javascript', 'python', 'cpp', 'java'])
          ]
        );

        // Contest 5: Official Admin Contest (COMPLETED)
        const [res5] = await pool.query(
          `INSERT INTO contests (slug, title, short_description, description, instructions, banner_url, contest_type, difficulty, organizer_type, created_by, status, visibility, registration_required, registration_start, registration_deadline, start_time, end_time, duration_minutes, max_participants, leaderboard_enabled, security_enabled, allowed_languages)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'beginners-warmup-cup-12',
            'Beginners Warmup Cup #12',
            'An entry-level contest designed for developers mastering fundamentals.',
            'Perfect for newcomers! Practice arrays, string manipulation, and simple search algorithms in a friendly timed environment.',
            '1. Solved problems count towards your profile XP.\n2. Unlimited submission attempts.',
            'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
            'CODING', 'Easy', 'ADMIN', adminId, 'COMPLETED', 'PUBLIC', 1,
            completedStart, completedStart, completedStart, completedEnd, 120, 200, 1, 1,
            JSON.stringify(['javascript', 'python', 'cpp', 'java'])
          ]
        );

        // Link Problems to Contests
        const [probs] = await pool.query("SELECT id FROM problems ORDER BY id ASC LIMIT 5;");
        if (probs.length > 0) {
          const contestIds = [res1.insertId, res2.insertId, res3.insertId, res4.insertId, res5.insertId];
          for (const cId of contestIds) {
            let idx = 1;
            for (const p of probs.slice(0, 3)) {
              await pool.query("INSERT INTO contest_problems (contest_id, problem_id, order_index, points) VALUES (?, ?, ?, ?)", [cId, p.id, idx, 100]);
              idx++;
            }
          }
        }

        console.log('Successfully seeded 5 initial demo contests (including Organization contests)!');
      }
    } catch (cSeedErr) {
      console.warn('Contest initial seeding error:', cSeedErr.message);
    }

  } catch (error) {
    console.error('CRITICAL DATABASE ERROR during initialization:', error.message);
    console.error('Please make sure MySQL is running and your .env credentials are correct.');
  }
}

// Accessor for the pool
function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initDB first.');
  }
  return pool;
}

module.exports = {
  initDB,
  getPool,
  query: (text, params) => getPool().query(text, params)
};
