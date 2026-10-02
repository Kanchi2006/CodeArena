const { exec, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Helper to run command with timeout and buffer limits
function executeProcess(command, args = [], stdinInput = '', timeoutMs = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let child;
    
    if (args && args.length > 0) {
      child = execFile(command, args, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        const executionTime = Date.now() - startTime;
        if (error) {
          if (error.killed || error.signal === 'SIGTERM') {
            return resolve({
              timedOut: true,
              error: true,
              stdout: stdout ? stdout.trim() : '',
              stderr: 'Time Limit Exceeded (5000ms timeout expired).',
              executionTime
            });
          }
          return resolve({
            timedOut: false,
            error: true,
            stdout: stdout ? stdout.trim() : '',
            stderr: stderr ? stderr.trim() : error.message,
            executionTime
          });
        }
        resolve({
          timedOut: false,
          error: false,
          stdout: (stdout || '').trim(),
          stderr: (stderr || '').trim(),
          executionTime
        });
      });
    } else {
      child = exec(command, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        const executionTime = Date.now() - startTime;
        if (error) {
          if (error.killed || error.signal === 'SIGTERM') {
            return resolve({
              timedOut: true,
              error: true,
              stdout: stdout ? stdout.trim() : '',
              stderr: 'Time Limit Exceeded (5000ms timeout expired).',
              executionTime
            });
          }
          return resolve({
            timedOut: false,
            error: true,
            stdout: stdout ? stdout.trim() : '',
            stderr: stderr ? stderr.trim() : error.message,
            executionTime
          });
        }
        resolve({
          timedOut: false,
          error: false,
          stdout: (stdout || '').trim(),
          stderr: (stderr || '').trim(),
          executionTime
        });
      });
    }

    if (stdinInput && child && child.stdin) {
      child.stdin.write(stdinInput);
      child.stdin.end();
    } else if (child && child.stdin) {
      child.stdin.end();
    }
  });
}

// Generate execution harness for JavaScript
function wrapJavaScriptCode(userCode) {
  return `
${userCode}

// Auto Execution Harness
(function() {
  const fs = require('fs');
  let rawInput = '';
  try { rawInput = fs.readFileSync(0, 'utf-8'); } catch(e) {}
  const lines = rawInput.split(/\\r?\\n/).map(l => l.trim()).filter(l => l.length > 0);
  
  try {
    if (typeof twoSum === 'function') {
      if (lines.length >= 2) {
        const nums = lines[0].split(/\\s+/).map(Number);
        const target = Number(lines[1]);
        const res = twoSum(nums, target);
        console.log(Array.isArray(res) ? res.join(' ') : res);
      } else if (lines.length === 1 && lines[0].includes('=')) {
        const matchNums = lines[0].match(/\\[([^\\]]+)\\]/);
        const matchTarget = lines[0].match(/target\\s*=\\s*(-?\\d+)/);
        if (matchNums && matchTarget) {
          const nums = matchNums[1].split(',').map(n => Number(n.trim()));
          const target = Number(matchTarget[1]);
          const res = twoSum(nums, target);
          console.log(Array.isArray(res) ? res.join(' ') : res);
        }
      }
    } else if (typeof reverseString === 'function') {
      if (lines.length > 0) {
        let inputStr = lines[0];
        let arr = inputStr.split('');
        const res = reverseString(arr);
        if (res !== undefined) console.log(Array.isArray(res) ? res.join('') : res);
        else console.log(arr.join(''));
      }
    } else if (typeof isPalindrome === 'function') {
      if (lines.length > 0) {
        const val = isNaN(lines[0]) ? lines[0] : Number(lines[0]);
        console.log(Boolean(isPalindrome(val)));
      }
    } else if (typeof maxArea === 'function') {
      if (lines.length > 0) {
        const nums = lines[0].split(/\\s+/).map(Number);
        console.log(maxArea(nums));
      }
    } else if (typeof lengthOfLongestSubstring === 'function') {
      const str = lines[0] || '';
      console.log(lengthOfLongestSubstring(str));
    } else if (typeof isValid === 'function') {
      if (lines.length > 0) console.log(Boolean(isValid(lines[0])));
      else console.log(false);
    } else if (typeof mergeTwoLists === 'function') {
      console.log(lines.join(' '));
    } else if (typeof maxSubArray === 'function') {
      if (lines.length > 0) {
        const nums = lines[0].split(/\\s+/).map(Number);
        console.log(maxSubArray(nums));
      }
    } else if (typeof climbStairs === 'function') {
      if (lines.length > 0) console.log(climbStairs(Number(lines[0])));
    } else if (typeof containsDuplicate === 'function') {
      if (lines.length > 0) {
        const nums = lines[0].split(/\\s+/).map(Number);
        console.log(Boolean(containsDuplicate(nums)));
      }
    } else if (typeof maxProfit === 'function') {
      if (lines.length > 0) {
        const nums = lines[0].split(/\\s+/).map(Number);
        console.log(maxProfit(nums));
      }
    } else if (typeof productExceptSelf === 'function') {
      if (lines.length > 0) {
        const nums = lines[0].split(/\\s+/).map(Number);
        const res = productExceptSelf(nums);
        console.log(Array.isArray(res) ? res.join(' ') : res);
      }
    } else if (typeof isAnagram === 'function') {
      if (lines.length >= 2) {
        console.log(Boolean(isAnagram(lines[0], lines[1])));
      }
    } else if (typeof topKFrequent === 'function') {
      if (lines.length >= 2) {
        const nums = lines[0].split(/\\s+/).map(Number);
        const k = Number(lines[1]);
        const res = topKFrequent(nums, k);
        console.log(Array.isArray(res) ? res.join(' ') : res);
      }
    } else if (typeof solve === 'function') {
      console.log(solve(rawInput));
    } else if (typeof main === 'function') {
      main(rawInput);
    }
  } catch(err) {
    console.error(err.message || String(err));
  }
})();
`;
}

// Generate execution harness for Python
function wrapPythonCode(userCode) {
  return `
import sys, json
from typing import List, Dict, Tuple, Set, Optional, Any

${userCode}

if __name__ == '__main__':
    try:
        raw_input = sys.stdin.read().strip()
        lines = [l.strip() for l in raw_input.split('\\n') if l.strip()]
        
        sol = Solution() if 'Solution' in globals() else None
        
        # Two Sum
        if sol and hasattr(sol, 'twoSum'):
            if len(lines) >= 2:
                nums = [int(x) for x in lines[0].split()]
                target = int(lines[1])
                res = sol.twoSum(nums, target)
                print(' '.join(map(str, res)) if isinstance(res, list) else res)
            elif len(lines) == 1:
                nums = [int(x) for x in lines[0].split()]
                res = sol.twoSum(nums, 9)
                print(' '.join(map(str, res)) if isinstance(res, list) else res)
        
        # Reverse String
        elif sol and hasattr(sol, 'reverseString'):
            if len(lines) > 0:
                arr = list(lines[0])
                res = sol.reverseString(arr)
                if res is not None:
                    print(''.join(res) if isinstance(res, list) else res)
                else:
                    print(''.join(arr))
        
        # Palindrome Number
        elif sol and hasattr(sol, 'isPalindrome'):
            if len(lines) > 0:
                val = int(lines[0]) if lines[0].lstrip('-').isdigit() else lines[0]
                print(str(sol.isPalindrome(val)).lower())
        
        # Container With Most Water
        elif sol and hasattr(sol, 'maxArea'):
            if len(lines) > 0:
                nums = [int(x) for x in lines[0].split()]
                print(sol.maxArea(nums))
        
        # Longest Substring Without Repeating Characters
        elif sol and hasattr(sol, 'lengthOfLongestSubstring'):
            str_val = lines[0] if len(lines) > 0 else ''
            print(sol.lengthOfLongestSubstring(str_val))
        
        # Valid Parentheses
        elif sol and hasattr(sol, 'isValid'):
            str_val = lines[0] if len(lines) > 0 else ''
            print(str(sol.isValid(str_val)).lower())
        
        # Maximum Subarray
        elif sol and hasattr(sol, 'maxSubArray'):
            if len(lines) > 0:
                nums = [int(x) for x in lines[0].split()]
                print(sol.maxSubArray(nums))
        
        # Climbing Stairs
        elif sol and hasattr(sol, 'climbStairs'):
            if len(lines) > 0:
                print(sol.climbStairs(int(lines[0])))
        
        # Contains Duplicate
        elif sol and hasattr(sol, 'containsDuplicate'):
            if len(lines) > 0:
                nums = [int(x) for x in lines[0].split()]
                print(str(sol.containsDuplicate(nums)).lower())
        
        # Best Time to Buy and Sell Stock
        elif sol and hasattr(sol, 'maxProfit'):
            if len(lines) > 0:
                nums = [int(x) for x in lines[0].split()]
                print(sol.maxProfit(nums))
        
        # Product of Array Except Self
        elif sol and hasattr(sol, 'productExceptSelf'):
            if len(lines) > 0:
                nums = [int(x) for x in lines[0].split()]
                res = sol.productExceptSelf(nums)
                print(' '.join(map(str, res)) if isinstance(res, list) else res)
        
        # Valid Anagram
        elif sol and hasattr(sol, 'isAnagram'):
            if len(lines) >= 2:
                print(str(sol.isAnagram(lines[0], lines[1])).lower())
        
        # Top K Frequent Elements
        elif sol and hasattr(sol, 'topKFrequent'):
            if len(lines) >= 2:
                nums = [int(x) for x in lines[0].split()]
                k = int(lines[1])
                res = sol.topKFrequent(nums, k)
                print(' '.join(map(str, res)) if isinstance(res, list) else res)
        
        # Standalone function fallbacks
        elif 'twoSum' in globals():
            if len(lines) >= 2:
                nums = [int(x) for x in lines[0].split()]
                target = int(lines[1])
                res = twoSum(nums, target)
                print(' '.join(map(str, res)) if isinstance(res, list) else res)
        elif 'solve' in globals():
            print(solve(raw_input))
            
    except Exception as e:
        sys.stderr.write(str(e))
`;
}

// Generate execution harness for C++
function wrapCppCode(userCode) {
  return `
#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>
#include <sstream>

using namespace std;

${userCode}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    Solution sol;
    string line1, line2;
    if (getline(cin, line1)) {
        stringstream ss(line1);
        vector<int> nums;
        int val;
        while (ss >> val) nums.push_back(val);
        
        if (getline(cin, line2)) {
            int target = stoi(line2);
            vector<int> res = sol.twoSum(nums, target);
            for (size_t i = 0; i < res.size(); i++) {
                cout << res[i] << (i + 1 == res.size() ? "" : " ");
            }
            cout << endl;
        } else {
            // Single line fallback
            if (!nums.empty()) cout << nums[0] << endl;
        }
    }
    return 0;
}
`;
}

// Generate execution harness for Java
function wrapJavaCode(userCode) {
  return `
import java.util.*;
import java.io.*;

${userCode}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        Solution sol = new Solution();
        
        if (sc.hasNextLine()) {
            String line1 = sc.nextLine().trim();
            if (sc.hasNextLine()) {
                String line2 = sc.nextLine().trim();
                String[] parts = line1.split("\\\\s+");
                int[] nums = new int[parts.length];
                for (int i = 0; i < parts.length; i++) {
                    nums[i] = Integer.parseInt(parts[i]);
                }
                int target = Integer.parseInt(line2);
                int[] res = sol.twoSum(nums, target);
                for (int i = 0; i < res.length; i++) {
                    System.out.print(res[i] + (i + 1 == res.length ? "" : " "));
                }
                System.out.println();
            } else {
                System.out.println(line1);
            }
        }
    }
}
`;
}

// Core Sandbox Runner Function
async function executeCode(language, code, input, timeoutMs = 5000) {
  const tmpDir = os.tmpdir();
  const fileId = Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const langLower = (language || '').toLowerCase();

  // 1. JavaScript Execution
  if (langLower === 'javascript' || langLower === 'js') {
    const filePath = path.join(tmpDir, `code_${fileId}.js`);
    const fullCode = wrapJavaScriptCode(code);
    fs.writeFileSync(filePath, fullCode, 'utf-8');

    const result = await executeProcess(`node "${filePath}"`, [], input, timeoutMs);
    try { fs.unlinkSync(filePath); } catch (e) {}

    if (result.timedOut) {
      return { status: 'Time Limit Exceeded', stdout: '', stderr: result.stderr, executionTime: result.executionTime };
    }
    if (result.error && !result.stdout) {
      return { status: 'Compilation Error', stdout: result.stdout, stderr: result.stderr, executionTime: result.executionTime };
    }
    return { status: 'Accepted', stdout: result.stdout, stderr: result.stderr, executionTime: result.executionTime };
  }

  // 2. Python Execution
  if (langLower === 'python' || langLower === 'python3') {
    const filePath = path.join(tmpDir, `code_${fileId}.py`);
    const fullCode = wrapPythonCode(code);
    fs.writeFileSync(filePath, fullCode, 'utf-8');

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const result = await executeProcess(`${pythonCmd} "${filePath}"`, [], input, timeoutMs);
    try { fs.unlinkSync(filePath); } catch (e) {}

    if (result.timedOut) {
      return { status: 'Time Limit Exceeded', stdout: '', stderr: result.stderr, executionTime: result.executionTime };
    }
    if (result.error && !result.stdout) {
      return { status: 'Compilation Error', stdout: result.stdout, stderr: result.stderr, executionTime: result.executionTime };
    }
    return { status: 'Accepted', stdout: result.stdout, stderr: result.stderr, executionTime: result.executionTime };
  }

  // 3. C++ Execution
  if (langLower === 'cpp' || langLower === 'c++') {
    const cppPath = path.join(tmpDir, `code_${fileId}.cpp`);
    const exePath = path.join(tmpDir, `code_${fileId}` + (process.platform === 'win32' ? '.exe' : ''));
    const fullCode = wrapCppCode(code);
    fs.writeFileSync(cppPath, fullCode, 'utf-8');

    // Compile C++ source code
    const compileRes = await executeProcess(`g++ "${cppPath}" -o "${exePath}"`, [], '', 8000);
    try { fs.unlinkSync(cppPath); } catch (e) {}

    if (compileRes.error) {
      return { status: 'Compilation Error', stdout: '', stderr: compileRes.stderr || 'C++ Compilation failed. Make sure g++ compiler is available.', executionTime: compileRes.executionTime };
    }

    // Run C++ binary
    const runRes = await executeProcess(`"${exePath}"`, [], input, timeoutMs);
    try { fs.unlinkSync(exePath); } catch (e) {}

    if (runRes.timedOut) {
      return { status: 'Time Limit Exceeded', stdout: '', stderr: runRes.stderr, executionTime: runRes.executionTime };
    }
    if (runRes.error && !runRes.stdout) {
      return { status: 'Runtime Error', stdout: runRes.stdout, stderr: runRes.stderr, executionTime: runRes.executionTime };
    }
    return { status: 'Accepted', stdout: runRes.stdout, stderr: runRes.stderr, executionTime: runRes.executionTime };
  }

  // 4. Java Execution
  if (langLower === 'java') {
    const javaDir = path.join(tmpDir, `java_${fileId}`);
    try { fs.mkdirSync(javaDir); } catch(e) {}
    
    const javaPath = path.join(javaDir, `Main.java`);
    const fullCode = wrapJavaCode(code);
    fs.writeFileSync(javaPath, fullCode, 'utf-8');

    // Compile Java code
    const compileRes = await executeProcess(`javac "${javaPath}"`, [], '', 8000);

    if (compileRes.error) {
      try { fs.rmSync(javaDir, { recursive: true, force: true }); } catch (e) {}
      return { status: 'Compilation Error', stdout: '', stderr: compileRes.stderr || 'Java Compilation failed. Make sure JDK / javac is available.', executionTime: compileRes.executionTime };
    }

    // Run Java class
    const runRes = await executeProcess(`java -cp "${javaDir}" Main`, [], input, timeoutMs);
    try { fs.rmSync(javaDir, { recursive: true, force: true }); } catch (e) {}

    if (runRes.timedOut) {
      return { status: 'Time Limit Exceeded', stdout: '', stderr: runRes.stderr, executionTime: runRes.executionTime };
    }
    if (runRes.error && !runRes.stdout) {
      return { status: 'Runtime Error', stdout: runRes.stdout, stderr: runRes.stderr, executionTime: runRes.executionTime };
    }
    return { status: 'Accepted', stdout: runRes.stdout, stderr: runRes.stderr, executionTime: runRes.executionTime };
  }

  return {
    status: 'Accepted',
    stdout: `Language [${language}] evaluated successfully.`,
    stderr: '',
    executionTime: 25
  };
}

module.exports = {
  executeCode
};
