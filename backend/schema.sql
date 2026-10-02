-- CodeArena Database Schema Initialization

CREATE DATABASE IF NOT EXISTS codearena_db;
USE codearena_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'organization', 'admin') DEFAULT 'user',
  solved_count INT DEFAULT 0,
  streak INT DEFAULT 0,
  xp INT DEFAULT 0,
  bio TEXT,
  github_profile VARCHAR(255),
  skills VARCHAR(255),
  display_name VARCHAR(255),
  is_blocked TINYINT(1) DEFAULT 0,
  activity_status VARCHAR(50) DEFAULT 'offline',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 1b. Organization Profiles Table
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
  verification_status ENUM('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'RESUBMISSION_REQUIRED') DEFAULT 'PENDING',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP NULL DEFAULT NULL,
  rejection_reason TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2. Problems Table
CREATE TABLE IF NOT EXISTS problems (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  difficulty ENUM('Easy', 'Medium', 'Hard') NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  constraints TEXT,
  input_format TEXT,
  output_format TEXT,
  sample_input TEXT,
  sample_output TEXT,
  test_cases JSON, -- Array of objects: {input: "...", expected: "..."}
  starter_code JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Submissions Table
CREATE TABLE IF NOT EXISTS submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  problem_id INT NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'Accepted', 'Wrong Answer', 'Runtime Error', 'Compilation Error'
  language VARCHAR(50) NOT NULL,
  code TEXT NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Pre-seed Problems with Clean Starter Code (No Pre-loaded Solution) and 10+ Test Cases
INSERT INTO problems (title, difficulty, category, description, constraints, input_format, output_format, sample_input, sample_output, test_cases, starter_code)
VALUES
(
  'Two Sum',
  'Easy',
  'Arrays',
  'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.',
  '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.',
  'First line: Space-separated integers representing the array nums\nSecond line: An integer target',
  'Space-separated indices of the two numbers',
  '2 7 11 15\n9',
  '0 1',
  '[{"input": "2 7 11 15\\n9", "expected": "0 1"}, {"input": "3 2 4\\n6", "expected": "1 2"}, {"input": "3 3\\n6", "expected": "0 1"}, {"input": "1 5 3 7\\n12", "expected": "1 3"}, {"input": "-1 -3 4 2\\n1", "expected": "1 2"}, {"input": "0 4 3 0\\n0", "expected": "0 3"}, {"input": "10 20 30 40 50\\n90", "expected": "3 4"}, {"input": "-5 10 25 -10\\n15", "expected": "2 3"}, {"input": "100 200 500\\n700", "expected": "1 2"}, {"input": "1 2 3 4 5\\n9", "expected": "3 4"}]',
  '{"javascript": "/**\\n * @param {number[]} nums\\n * @param {number} target\\n * @return {number[]}\\n */\\nfunction twoSum(nums, target) {\\n    // Write your code here\\n}", "python": "class Solution:\\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\\n        # Write your code here\\n        pass", "cpp": "class Solution {\\npublic:\\n    vector<int> twoSum(vector<int>& nums, int target) {\\n        // Write your code here\\n        return {};\\n    }\\n};", "java": "class Solution {\\n    public int[] twoSum(int[] nums, int target) {\\n        // Write your code here\\n        return new int[]{};\\n    }\\n}"}'
),
(
  'Reverse String',
  'Easy',
  'Strings',
  'Write a function that reverses a string. The input string is given as an array of characters `s`.\n\nYou must do this by modifying the input array in-place with O(1) extra memory.',
  '1 <= s.length <= 10^5\ns[i] is a printable ascii character',
  'A single line containing the string s',
  'The reversed string',
  'hello',
  'olleh',
  '[{"input": "hello", "expected": "olleh"}, {"input": "Hannah", "expected": "hannaH"}, {"input": "CodeArena", "expected": "anerAedoC"}, {"input": "a", "expected": "a"}, {"input": "ab", "expected": "ba"}, {"input": "racecar", "expected": "racecar"}, {"input": "12345", "expected": "54321"}, {"input": "OpenAI", "expected": "IAnepO"}, {"input": "FullStack", "expected": "kcatSlluF"}, {"input": "Algorithms", "expected": "smhtiroglA"}]',
  '{"javascript": "function reverseString(s) {\\n    // Write your code here\\n}", "python": "class Solution:\\n    def reverseString(self, s: List[str]) -> None:\\n        # Write your code here\\n        pass", "cpp": "class Solution {\\npublic:\\n    void reverseString(vector<char>& s) {\\n        // Write your code here\\n    }\\n};", "java": "class Solution {\\n    public void reverseString(char[] s) {\\n        // Write your code here\\n    }\\n}"}'
),
(
  'Palindrome Number',
  'Easy',
  'Math',
  'Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise.\n\nAn integer is a palindrome when it reads the same backward as forward. For example, `121` is a palindrome while `123` is not.',
  '-2^31 <= x <= 2^31 - 1',
  'A single line containing an integer x',
  'true or false',
  '121',
  'true',
  '[{"input": "121", "expected": "true"}, {"input": "-121", "expected": "false"}, {"input": "10", "expected": "false"}, {"input": "12321", "expected": "true"}, {"input": "0", "expected": "true"}, {"input": "1", "expected": "true"}, {"input": "1221", "expected": "true"}, {"input": "123", "expected": "false"}, {"input": "-101", "expected": "false"}, {"input": "9999", "expected": "true"}]',
  '{"javascript": "function isPalindrome(x) {\\n    // Write your code here\\n}", "python": "class Solution:\\n    def isPalindrome(self, x: int) -> bool:\\n        # Write your code here\\n        pass", "cpp": "class Solution {\\npublic:\\n    bool isPalindrome(int x) {\\n        // Write your code here\\n        return false;\\n    }\\n};", "java": "class Solution {\\n    public boolean isPalindrome(int x) {\\n        // Write your code here\\n        return false;\\n    }\\n}"}'
),
(
  'Container With Most Water',
  'Medium',
  'Two Pointers',
  'You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the `i-th` line are `(i, 0)` and `(i, height[i])`.\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water.\n\nReturn the maximum amount of water a container can store.',
  'n == height.length\n2 <= n <= 10^5\n0 <= height[i] <= 10^4',
  'A single line containing space-separated integers representing the height array',
  'An integer representing the maximum volume of water',
  '1 8 6 2 5 4 8 3 7',
  '49',
  '[{"input": "1 8 6 2 5 4 8 3 7", "expected": "49"}, {"input": "1 1", "expected": "1"}, {"input": "4 3 2 1 4", "expected": "16"}, {"input": "1 2 1", "expected": "2"}, {"input": "2 3 4 5 18 17 6", "expected": "17"}, {"input": "1 2 4 3", "expected": "4"}, {"input": "10 9 8 7 6 5 4 3 2 1", "expected": "25"}, {"input": "5 5 5 5 5", "expected": "20"}, {"input": "1 100 100 1", "expected": "100"}, {"input": "3 9 3 4 7 2 12 6", "expected": "45"}]',
  '{"javascript": "function maxArea(height) {\\n    // Write your code here\\n}", "python": "class Solution:\\n    def maxArea(self, height: List[int]) -> int:\\n        # Write your code here\\n        pass", "cpp": "class Solution {\\npublic:\\n    int maxArea(vector<int>& height) {\\n        // Write your code here\\n        return 0;\\n    }\\n};", "java": "class Solution {\\n    public int maxArea(int[] height) {\\n        // Write your code here\\n        return 0;\\n    }\\n}"}'
),
(
  'Longest Substring Without Repeating Characters',
  'Medium',
  'Sliding Window',
  'Given a string `s`, find the length of the longest substring without repeating characters.',
  '0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols and spaces.',
  'A single line containing the string s (could be empty)',
  'An integer representing the length of the longest unique substring',
  'abcabcbb',
  '3',
  '[{"input": "abcabcbb", "expected": "3"}, {"input": "bbbbb", "expected": "1"}, {"input": "pwwkew", "expected": "3"}, {"input": "", "expected": "0"}, {"input": "a", "expected": "1"}, {"input": "au", "expected": "2"}, {"input": "dvdf", "expected": "3"}, {"input": "anviaj", "expected": "5"}, {"input": "tmmzuxt", "expected": "5"}, {"input": "codearena", "expected": "6"}]',
  '{"javascript": "function lengthOfLongestSubstring(s) {\\n    // Write your code here\\n}", "python": "class Solution:\\n    def lengthOfLongestSubstring(self, s: str) -> int:\\n        # Write your code here\\n        pass", "cpp": "class Solution {\\npublic:\\n    int lengthOfLongestSubstring(string s) {\\n        // Write your code here\\n        return 0;\\n    }\\n};", "java": "class Solution {\\n    public int lengthOfLongestSubstring(String s) {\\n        // Write your code here\\n        return 0;\\n    }\\n}"}'
),
(
  'Median of Two Sorted Arrays',
  'Hard',
  'Binary Search',
  'Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the median of the two sorted arrays.\n\nThe overall run time complexity should be O(log (m+n)).',
  'nums1.length == m, nums2.length == n\n0 <= m, n <= 1000\n1 <= m + n <= 2000\n-10^6 <= nums1[i], nums2[j] <= 10^6',
  'First line: Space-separated integers representing nums1\nSecond line: Space-separated integers representing nums2',
  'A float representing the median of the combined arrays',
  '1 3\n2',
  '2.0',
  '[{"input": "1 3\\n2", "expected": "2.0"}, {"input": "1 2\\n3 4", "expected": "2.5"}, {"input": "0 0\\n0 0", "expected": "0.0"}, {"input": "\\n1", "expected": "1.0"}, {"input": "2\\n", "expected": "2.0"}, {"input": "1 3 5\\n2 4 6", "expected": "3.5"}, {"input": "1 2 3\\n4 5", "expected": "3.0"}, {"input": "10 20\\n30 40 50", "expected": "30.0"}, {"input": "1 5 9\\n2 6 10", "expected": "5.5"}, {"input": "100\\n200", "expected": "150.0"}]',
  '{"javascript": "function findMedianSortedArrays(nums1, nums2) {\\n    // Write your code here\\n}", "python": "class Solution:\\n    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:\\n        # Write your code here\\n        pass", "cpp": "class Solution {\\npublic:\\n    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {\\n        // Write your code here\\n        return 0.0;\\n    }\\n};", "java": "class Solution {\\n    public double findMedianSortedArrays(int[] nums1, int[] nums2) {\\n        // Write your code here\\n        return 0.0;\\n    }\\n}"}'
),
(
  'Valid Parentheses',
  'Easy',
  'Stacks',
  'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.',
  '1 <= s.length <= 10^4\ns consists of parentheses only.',
  'A single line containing the parentheses string s',
  'true or false',
  '()[]{}',
  'true',
  '[{"input": "()[]{}", "expected": "true"}, {"input": "([)]", "expected": "false"}, {"input": "{[]}", "expected": "true"}, {"input": "()", "expected": "true"}, {"input": "(]", "expected": "false"}, {"input": "(((())))", "expected": "true"}, {"input": "(", "expected": "false"}, {"input": ")", "expected": "false"}, {"input": "{[()]}", "expected": "true"}, {"input": "{[(])}", "expected": "false"}]',
  '{"javascript": "function isValid(s) {\\n    // Write your code here\\n}", "python": "class Solution:\\n    def isValid(self, s: str) -> bool:\\n        # Write your code here\\n        pass", "cpp": "class Solution {\\npublic:\\n    bool isValid(string s) {\\n        // Write your code here\\n        return false;\\n    }\\n};", "java": "class Solution {\\n    public boolean isValid(String s) {\\n        // Write your code here\\n        return false;\\n    }\\n}"}'
),
(
  'Merge Two Sorted Lists',
  'Easy',
  'Linked Lists',
  'You are given the heads of two sorted linked lists list1 and list2.\nMerge the two lists into one sorted list.',
  'The number of nodes in both lists is in the range [0, 50].',
  'First line: space separated integers for list1\nSecond line: space separated integers for list2',
  'Space separated merged sorted integers list',
  '1 2 4\n1 3 4',
  '1 1 2 3 4 4',
  '[{"input": "1 2 4\\n1 3 4", "expected": "1 1 2 3 4 4"}, {"input": "\\n", "expected": ""}, {"input": "\\n0", "expected": "0"}, {"input": "1 5 10\\n2 3 8", "expected": "1 2 3 5 8 10"}, {"input": "5 6 7\\n1 2 3", "expected": "1 2 3 5 6 7"}, {"input": "1 1 1\\n2 2 2", "expected": "1 1 1 2 2 2"}, {"input": "10\\n20", "expected": "10 20"}, {"input": "-5 -2 0\\n-3 1 4", "expected": "-5 -3 -2 0 1 4"}, {"input": "1 3 5 7\\n2 4 6 8", "expected": "1 2 3 4 5 6 7 8"}, {"input": "100\\n50 150", "expected": "50 100 150"}]',
  '{"javascript": "function mergeTwoLists(list1, list2) {\\n    // Write your code here\\n}", "python": "class Solution:\\n    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:\\n        # Write your code here\\n        pass", "cpp": "class Solution {\\npublic:\\n    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {\\n        // Write your code here\\n        return nullptr;\\n    }\\n};", "java": "class Solution {\\n    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {\\n        // Write your code here\\n        return null;\\n    }\\n}"}'
),
(
  'Maximum Subarray',
  'Medium',
  'Dynamic Programming',
  'Given an integer array `nums`, find the subarray with the largest sum and return its sum.',
  '1 <= nums.length <= 10^5',
  'Space separated integers representing the array nums',
  'Single integer representing max sum',
  '-2 1 -3 4 -1 2 1 -5 4',
  '6',
  '[{"input": "-2 1 -3 4 -1 2 1 -5 4", "expected": "6"}, {"input": "1", "expected": "1"}, {"input": "5 4 -1 7 8", "expected": "23"}, {"input": "-1 -2 -3 -4", "expected": "-1"}, {"input": "-2 -1", "expected": "-1"}, {"input": "1 2 3 4 5", "expected": "15"}, {"input": "-2 3 2 -1", "expected": "5"}, {"input": "10 -2 3 5 -1", "expected": "16"}, {"input": "-5 10 -2 8 -1", "expected": "16"}, {"input": "0 0 0 0", "expected": "0"}]',
  '{"javascript": "function maxSubArray(nums) {\\n    // Write your code here\\n}", "python": "class Solution:\\n    def maxSubArray(self, nums: List[int]) -> int:\\n        # Write your code here\\n        pass", "cpp": "class Solution {\\npublic:\\n    int maxSubArray(vector<int>& nums) {\\n        // Write your code here\\n        return 0;\\n    }\\n};", "java": "class Solution {\\n    public int maxSubArray(int[] nums) {\\n        // Write your code here\\n        return 0;\\n    }\\n}"}'
),
(
  'Climbing Stairs',
  'Easy',
  'Dynamic Programming',
  'You are climbing a staircase. It takes `n` steps to reach the top.\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
  '1 <= n <= 45',
  'An integer representing n',
  'An integer representing number of ways',
  '3',
  '3',
  '[{"input": "3", "expected": "3"}, {"input": "4", "expected": "5"}, {"input": "1", "expected": "1"}, {"input": "2", "expected": "2"}, {"input": "5", "expected": "8"}, {"input": "6", "expected": "13"}, {"input": "7", "expected": "21"}, {"input": "8", "expected": "34"}, {"input": "10", "expected": "89"}, {"input": "12", "expected": "233"}]',
  '{"javascript": "function climbStairs(n) {\\n    // Write your code here\\n}", "python": "class Solution:\\n    def climbStairs(self, n: int) -> int:\\n        # Write your code here\\n        pass", "cpp": "class Solution {\\npublic:\\n    int climbStairs(int n) {\\n        // Write your code here\\n        return 0;\\n    }\\n};", "java": "class Solution {\\n    public int climbStairs(int n) {\\n        // Write your code here\\n        return 0;\\n    }\\n}"}'
),
(
  'Binary Tree Inorder Traversal',
  'Easy',
  'Trees',
  'Given the root of a binary tree, return the inorder traversal of its nodes values.',
  'The number of nodes in the tree is in the range [0, 100].',
  'Space separated integers representing level-order nodes (null for empty)',
  'Space separated values of inorder traversal',
  '1 null 2 3',
  '1 3 2',
  '[{"input": "1 null 2 3", "expected": "1 3 2"}, {"input": "", "expected": ""}, {"input": "1", "expected": "1"}, {"input": "1 2 3", "expected": "2 1 3"}, {"input": "1 2 null 3", "expected": "3 2 1"}, {"input": "4 2 5 1 3", "expected": "1 2 3 4 5"}, {"input": "1 null 2 null 3", "expected": "1 2 3"}, {"input": "3 1 4 null 2", "expected": "1 2 3 4"}, {"input": "5 3 8 2 4", "expected": "2 3 4 5 8"}, {"input": "10 5 15", "expected": "5 10 15"}]',
  '{"javascript": "function inorderTraversal(root) {\\n    // Write your code here\\n}", "python": "class Solution:\\n    def inorderTraversal(self, root: Optional[TreeNode]) -> List[int]:\\n        # Write your code here\\n        pass", "cpp": "class Solution {\\npublic:\\n    vector<int> inorderTraversal(TreeNode* root) {\\n        // Write your code here\\n        return {};\\n    }\\n};", "java": "class Solution {\\n    public List<Integer> inorderTraversal(TreeNode root) {\\n        // Write your code here\\n        return new ArrayList<>();\\n    }\\n}"}'
),
(
  'Maximum Depth of Binary Tree',
  'Easy',
  'Trees',
  'Given the root of a binary tree, return its maximum depth.',
  'The number of nodes in the tree is in the range [0, 10^4].',
  'Space separated integers representing level-order tree nodes',
  'An integer representing max depth',
  '3 9 20 null null 15 7',
  '3',
  '[{"input": "3 9 20 null null 15 7", "expected": "3"}, {"input": "1 null 2", "expected": "2"}, {"input": "", "expected": "0"}, {"input": "0", "expected": "1"}, {"input": "1 2 3 4 5", "expected": "3"}, {"input": "1 2 null 3 null 4", "expected": "4"}, {"input": "1 2 3 4 null null 5", "expected": "3"}, {"input": "1 2 3 4 5 6 7", "expected": "3"}, {"input": "1 null 2 null 3 null 4", "expected": "4"}, {"input": "5 4 8 11 null 13 4", "expected": "4"}]',
  '{"javascript": "function maxDepth(root) {\\n    // Write your code here\\n}", "python": "class Solution:\\n    def maxDepth(self, root: Optional[TreeNode]) -> int:\\n        # Write your code here\\n        pass", "cpp": "class Solution {\\npublic:\\n    int maxDepth(TreeNode* root) {\\n        // Write your code here\\n        return 0;\\n    }\\n};", "java": "class Solution {\\n    public int maxDepth(TreeNode root) {\\n        // Write your code here\\n        return 0;\\n    }\\n}"}'
),
(
  'Valid Anagram',
  'Easy',
  'Hashing',
  'Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.',
  '1 <= s.length, t.length <= 5 * 10^4',
  'First line: string s\nSecond line: string t',
  'true or false',
  'anagram\nnagaram',
  'true',
  '[{"input": "anagram\\nnagaram", "expected": "true"}, {"input": "rat\\ncar", "expected": "false"}, {"input": "a\\na", "expected": "true"}, {"input": "ab\\nba", "expected": "true"}, {"input": "listen\\nsilent", "expected": "true"}, {"input": "hello\\nbillion", "expected": "false"}, {"input": "fluster\\nrestful", "expected": "true"}, {"input": "triangle\\nintegral", "expected": "true"}, {"input": "abc\\nabcd", "expected": "false"}, {"input": "aacc\\nccac", "expected": "false"}]',
  '{"javascript": "function isAnagram(s, t) {\\n    // Write your code here\\n}", "python": "class Solution:\\n    def isAnagram(self, s: str, t: str) -> bool:\\n        # Write your code here\\n        pass", "cpp": "class Solution {\\npublic:\\n    bool isAnagram(string s, string t) {\\n        // Write your code here\\n        return false;\\n    }\\n};", "java": "class Solution {\\n    public boolean isAnagram(String s, String t) {\\n        // Write your code here\\n        return false;\\n    }\\n}"}'
),
(
  'Contains Duplicate',
  'Easy',
  'Arrays',
  'Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.',
  '1 <= nums.length <= 10^5',
  'Space separated integers representing the array',
  'true or false',
  '1 2 3 1',
  'true',
  '[{"input": "1 2 3 1", "expected": "true"}, {"input": "1 2 3 4", "expected": "false"}, {"input": "1 1 1 3 3 4 3 2 4 2", "expected": "true"}, {"input": "1", "expected": "false"}, {"input": "1 1", "expected": "true"}, {"input": "-1 -1", "expected": "true"}, {"input": "0 1 2 3 4 5", "expected": "false"}, {"input": "10 20 30 10", "expected": "true"}, {"input": "100 200 300", "expected": "false"}, {"input": "5 4 3 2 1 5", "expected": "true"}]',
  '{"javascript": "function containsDuplicate(nums) {\\n    // Write your code here\\n}", "python": "class Solution:\\n    def containsDuplicate(self, nums: List[int]) -> bool:\\n        # Write your code here\\n        pass", "cpp": "class Solution {\\npublic:\\n    bool containsDuplicate(vector<int>& nums) {\\n        // Write your code here\\n        return false;\\n    }\\n};", "java": "class Solution {\\n    public boolean containsDuplicate(int[] nums) {\\n        // Write your code here\\n        return false;\\n    }\\n}"}'
),
(
  'Best Time to Buy and Sell Stock',
  'Easy',
  'Arrays',
  'You are given an array `prices` where `prices[i]` is the price of a given stock on the `i-th` day.\nFind the maximum profit you can achieve.',
  '1 <= prices.length <= 10^5',
  'Space separated integers representing prices on consecutive days',
  'An integer representing max profit',
  '7 1 5 3 6 4',
  '5',
  '[{"input": "7 1 5 3 6 4", "expected": "5"}, {"input": "7 6 4 3 1", "expected": "0"}, {"input": "1 2", "expected": "1"}, {"input": "2 4 1", "expected": "2"}, {"input": "3 2 6 5 0 3", "expected": "4"}, {"input": "1 2 3 4 5", "expected": "4"}, {"input": "5 4 3 2 10", "expected": "8"}, {"input": "10 10 10", "expected": "0"}, {"input": "2 1 2 1 0 1 2", "expected": "2"}, {"input": "1 7 2 3 6 7", "expected": "6"}]',
  '{"javascript": "function maxProfit(prices) {\\n    // Write your code here\\n}", "python": "class Solution:\\n    def maxProfit(self, prices: List[int]) -> int:\\n        # Write your code here\\n        pass", "cpp": "class Solution {\\npublic:\\n    int maxProfit(vector<int>& prices) {\\n        // Write your code here\\n        return 0;\\n    }\\n};", "java": "class Solution {\\n    public int maxProfit(int[] prices) {\\n        // Write your code here\\n        return 0;\\n    }\\n}"}'
),
(
  'Product of Array Except Self',
  'Medium',
  'Arrays',
  'Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`. Must solve in O(N) without division.',
  '2 <= nums.length <= 10^5',
  'Space separated integers representing nums',
  'Space separated integers representing products',
  '1 2 3 4',
  '24 12 8 6',
  '[{"input": "1 2 3 4", "expected": "24 12 8 6"}, {"input": "-1 1 0 -3 3", "expected": "0 0 9 0 0"}, {"input": "2 3", "expected": "3 2"}, {"input": "0 0", "expected": "0 0"}, {"input": "1 1 1 1", "expected": "1 1 1 1"}, {"input": "-1 -2 -3 -4", "expected": "-24 -12 -8 -6"}, {"input": "5 2 4", "expected": "8 20 10"}, {"input": "1 0 3", "expected": "0 3 0"}, {"input": "2 2 2 2", "expected": "8 8 8 8"}, {"input": "10 2 5", "expected": "10 50 20"}]',
  '{"javascript": "function productExceptSelf(nums) {\\n    // Write your code here\\n}", "python": "class Solution:\\n    def productExceptSelf(self, nums: List[int]) -> List[int]:\\n        # Write your code here\\n        pass", "cpp": "class Solution {\\npublic:\\n    vector<int> productExceptSelf(vector<int>& nums) {\\n        // Write your code here\\n        return {};\\n    }\\n};", "java": "class Solution {\\n    public int[] productExceptSelf(int[] nums) {\\n        // Write your code here\\n        return new int[]{};\\n    }\\n}"}'
),
(
  'Group Anagrams',
  'Medium',
  'Hashing',
  'Given an array of strings `strs`, group the anagrams together. You can return the answer in any order.',
  '1 <= strs.length <= 10^4',
  'A single line containing space separated strings',
  'Grouped anagram strings separate by comma/newline',
  'eat tea tan ate nat bat',
  'eat tea ate, tan nat, bat',
  '[{"input": "eat tea tan ate nat bat", "expected": "eat tea ate, tan nat, bat"}, {"input": "", "expected": ""}, {"input": "a", "expected": "a"}, {"input": "ab ba", "expected": "ab ba"}, {"input": "abc bca cab", "expected": "abc bca cab"}, {"input": "listen silent enlists", "expected": "listen silent, enlists"}, {"input": "rat tar art car", "expected": "rat tar art, car"}, {"input": "cat act tac dog god", "expected": "cat act tac, dog god"}, {"input": "hello", "expected": "hello"}, {"input": "a b c", "expected": "a, b, c"}]',
  '{"javascript": "function groupAnagrams(strs) {\\n    // Write your code here\\n}", "python": "class Solution:\\n    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:\\n        # Write your code here\\n        pass", "cpp": "class Solution {\\npublic:\\n    vector<vector<string>> groupAnagrams(vector<string>& strs) {\\n        // Write your code here\\n        return {};\\n    }\\n};", "java": "class Solution {\\n    public List<List<String>> groupAnagrams(String[] strs) {\\n        // Write your code here\\n        return new ArrayList<>();\\n    }\\n}"}'
),
(
  'Top K Frequent Elements',
  'Medium',
  'Hashing',
  'Given an integer array `nums` and an integer `k`, return the `k` most frequent elements.',
  '1 <= nums.length <= 10^5',
  'First line: space separated array integers\nSecond line: integer k',
  'Space separated top K frequent elements',
  '1 1 1 2 2 3\n2',
  '1 2',
  '[{"input": "1 1 1 2 2 3\\n2", "expected": "1 2"}, {"input": "1\\n1", "expected": "1"}, {"input": "4 4 4 6 6 7\\n2", "expected": "4 6"}, {"input": "1 2 3 4\\n4", "expected": "1 2 3 4"}, {"input": "5 5 5 5\\n1", "expected": "5"}, {"input": "1 1 2 2 3 3\\n3", "expected": "1 2 3"}, {"input": "-1 -1 2 2 2\\n1", "expected": "2"}, {"input": "10 20 20 30 30 30\\n2", "expected": "30 20"}, {"input": "1 2 2 3 3 3 4 4 4 4\\n1", "expected": "4"}, {"input": "100 200 100 300 200 100\\n2", "expected": "100 200"}]',
  '{"javascript": "function topKFrequent(nums, k) {\\n    // Write your code here\\n}", "python": "class Solution:\\n    def topKFrequent(self, nums: List[int], k: int) -> List[int]:\\n        # Write your code here\\n        pass", "cpp": "class Solution {\\npublic:\\n    vector<int> topKFrequent(vector<int>& nums, int k) {\\n        // Write your code here\\n        return {};\\n    }\\n};", "java": "class Solution {\\n    public int[] topKFrequent(int[] nums, int k) {\\n        // Write your code here\\n        return new int[]{};\\n    }\\n}"}'
),
(
  '3Sum',
  'Medium',
  'Two Pointers',
  'Given an integer array `nums`, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and their sum equals zero.',
  '3 <= nums.length <= 3000',
  'Space separated integers representing nums',
  'Space separated list of unique triplets',
  '-1 0 1 2 -1 -4',
  '-1 -1 2, -1 0 1',
  '[{"input": "-1 0 1 2 -1 -4", "expected": "-1 -1 2, -1 0 1"}, {"input": "0 1 1", "expected": ""}, {"input": "0 0 0", "expected": "0 0 0"}, {"input": "-2 0 0 2 2", "expected": "-2 0 2"}, {"input": "-1 0 1", "expected": "-1 0 1"}, {"input": "-4 -1 -1 0 1 2", "expected": "-1 -1 2, -1 0 1"}, {"input": "1 2 -2 -1", "expected": ""}, {"input": "-2 0 1 1 2", "expected": "-2 0 2, -2 1 1"}, {"input": "0 0 0 0", "expected": "0 0 0"}, {"input": "-5 1 2 3 4", "expected": "-5 1 4, -5 2 3"}]',
  '{"javascript": "function threeSum(nums) {\\n    // Write your code here\\n}", "python": "class Solution:\\n    def threeSum(self, nums: List[int]) -> List[List[int]]:\\n        # Write your code here\\n        pass", "cpp": "class Solution {\\npublic:\\n    vector<vector<int>> threeSum(vector<int>& nums) {\\n        // Write your code here\\n        return {};\\n    }\\n};", "java": "class Solution {\\n    public List<List<Integer>> threeSum(int[] nums) {\\n        // Write your code here\\n        return new ArrayList<>();\\n    }\\n}"}'
),
(
  'Valid Sudoku',
  'Medium',
  'Matrix',
  'Determine if a 9 x 9 Sudoku board is valid. Only the filled cells need to be validated according to the Sudoku rules.',
  'Board size is always 9x9.',
  '9 lines of 9 space-separated characters (1-9 or .)',
  'true or false',
  '5 3 . . 7 . . . .\n6 . . 1 9 5 . . .\n. 9 8 . . . . 6 .\n8 . . . 6 . . . 3\n4 . . 8 . 3 . . 1\n7 . . . 2 . . . 6\n. 6 . . . . 2 8 .\n. . . 4 1 9 . . 5\n. . . . 8 . . 7 9',
  'true',
  '[{"input": "5 3 . . 7 . . . .\\n6 . . 1 9 5 . . .\\n. 9 8 . . . . 6 .\\n8 . . . 6 . . . 3\\n4 . . 8 . 3 . . 1\\n7 . . . 2 . . . 6\\n. 6 . . . . 2 8 .\\n. . . 4 1 9 . . 5\\n. . . . 8 . . 7 9", "expected": "true"}]',
  '{"javascript": "function isValidSudoku(board) {\\n    // Write your code here\\n}", "python": "class Solution:\\n    def isValidSudoku(self, board: List[List[str]]) -> bool:\\n        # Write your code here\\n        pass", "cpp": "class Solution {\\npublic:\\n    bool isValidSudoku(vector<vector<char>>& board) {\\n        // Write your code here\\n        return false;\\n    }\\n};", "java": "class Solution {\\n    public boolean isValidSudoku(char[][] board) {\\n        // Write your code here\\n        return false;\\n    }\\n}"}'
);

-- ==================================================
-- ASSESSMENT SYSTEM TABLES & INDEXES
-- ==================================================

-- 4. Assessments Master Table
CREATE TABLE IF NOT EXISTS assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assessment_type ENUM('Coding', 'MCQ', 'Mixed', 'Technical', 'Practice', 'Recruitment', 'Custom') DEFAULT 'Mixed',
  difficulty ENUM('Easy', 'Medium', 'Hard', 'Mixed') DEFAULT 'Medium',
  category VARCHAR(100) DEFAULT 'General',
  tags JSON,
  start_time DATETIME NULL,
  end_time DATETIME NULL,
  duration_minutes INT DEFAULT 60,
  time_zone VARCHAR(100) DEFAULT 'UTC',
  passing_score_percentage DECIMAL(5,2) DEFAULT 60.00,
  passing_score_absolute DECIMAL(8,2) DEFAULT 0.00,
  default_positive_marks DECIMAL(6,2) DEFAULT 2.00,
  default_negative_marks DECIMAL(6,2) DEFAULT 0.50,
  partial_scoring_enabled TINYINT(1) DEFAULT 1,
  attempt_limit INT DEFAULT 1, -- 0 means unlimited
  result_selection_strategy ENUM('best_score', 'latest_attempt', 'first_attempt', 'manual') DEFAULT 'best_score',
  random_question_order TINYINT(1) DEFAULT 0,
  random_option_order TINYINT(1) DEFAULT 0,
  question_pool_randomization TINYINT(1) DEFAULT 0,
  visibility ENUM('PUBLIC', 'PRIVATE', 'INVITE_ONLY') DEFAULT 'PUBLIC',
  candidate_limit INT DEFAULT 0, -- 0 means no limit
  instructions TEXT,
  rules TEXT,
  custom_notes TEXT,
  show_score_immediately TINYINT(1) DEFAULT 1,
  show_correct_answers TINYINT(1) DEFAULT 0,
  show_explanations TINYINT(1) DEFAULT 0,
  certificate_enabled TINYINT(1) DEFAULT 1,
  certificate_title VARCHAR(255) DEFAULT NULL,
  certificate_description TEXT DEFAULT NULL,
  status ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'UPCOMING', 'AVAILABLE', 'EXPIRED', 'CANCELLED', 'ARCHIVED') DEFAULT 'DRAFT',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_assessments_status (status),
  INDEX idx_assessments_dates (start_time, end_time),
  INDEX idx_assessments_visibility (visibility)
) ENGINE=InnoDB;

-- 5. Assessment Sections Table
CREATE TABLE IF NOT EXISTS assessment_sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INT DEFAULT 0,
  section_marks DECIMAL(8,2) DEFAULT 0.00,
  section_time_limit_minutes INT DEFAULT 0, -- 0 means no section limit
  section_instructions TEXT,
  question_pool_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  INDEX idx_sec_assessment (assessment_id, order_index)
) ENGINE=InnoDB;

-- 6. Assessment Questions Table
CREATE TABLE IF NOT EXISTS assessment_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT NOT NULL,
  section_id INT NULL,
  question_type ENUM('mcq', 'multiple_select', 'coding', 'output_based') NOT NULL,
  problem_id INT NULL, -- References problems table if coding
  question_text TEXT NOT NULL,
  code_snippet TEXT NULL,
  options JSON NULL, -- [{id: 'opt1', text: '...', is_correct: true/false}]
  correct_answers JSON NULL, -- Array of option IDs or text
  explanation TEXT NULL,
  marks DECIMAL(6,2) DEFAULT 2.00,
  negative_marks DECIMAL(6,2) DEFAULT 0.00,
  order_index INT DEFAULT 0,
  is_required TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES assessment_sections(id) ON DELETE SET NULL,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE SET NULL,
  INDEX idx_quest_assessment (assessment_id, order_index),
  INDEX idx_quest_section (section_id)
) ENGINE=InnoDB;

-- 7. Assessment Question Pools Table
CREATE TABLE IF NOT EXISTS assessment_question_pools (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT NOT NULL,
  section_id INT NULL,
  name VARCHAR(255) NOT NULL,
  pool_size INT NOT NULL,
  questions_to_display INT NOT NULL,
  question_ids JSON NOT NULL, -- Array of question IDs
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES assessment_sections(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 8. Assessment Attempts Table
CREATE TABLE IF NOT EXISTS assessment_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  attempt_id VARCHAR(100) UNIQUE NOT NULL, -- UUID/unique key
  user_id INT NOT NULL,
  assessment_id INT NOT NULL,
  attempt_number INT DEFAULT 1,
  start_time DATETIME NOT NULL,
  deadline_time DATETIME NOT NULL,
  last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME NULL,
  submission_time DATETIME NULL,
  status ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'EVALUATING', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'DISQUALIFIED') DEFAULT 'IN_PROGRESS',
  total_earned_marks DECIMAL(8,2) DEFAULT 0.00,
  total_possible_marks DECIMAL(8,2) DEFAULT 0.00,
  percentage DECIMAL(5,2) DEFAULT 0.00,
  is_passed TINYINT(1) DEFAULT 0,
  is_final_result TINYINT(1) DEFAULT 0,
  question_order JSON NULL, -- Array of question IDs in assigned sequence
  option_order JSON NULL, -- Object map {questionId: ['opt2', 'opt1', ...]}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  INDEX idx_attempts_user (user_id),
  INDEX idx_attempts_assessment (assessment_id),
  INDEX idx_attempts_status (status)
) ENGINE=InnoDB;

-- 9. Assessment Responses Table (Auto-saved candidate answers)
CREATE TABLE IF NOT EXISTS assessment_responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  attempt_id VARCHAR(100) NOT NULL,
  question_id INT NOT NULL,
  response_data JSON NULL, -- { selected_options: [], text_answer: '', coding_source: '', language: '' }
  is_answered TINYINT(1) DEFAULT 0,
  is_marked_for_review TINYINT(1) DEFAULT 0,
  is_visited TINYINT(1) DEFAULT 0,
  score_earned DECIMAL(6,2) DEFAULT 0.00,
  is_correct TINYINT(1) DEFAULT 0,
  evaluation_status ENUM('AUTO_EVALUATED', 'PENDING_MANUAL', 'MANUALLY_EVALUATED') DEFAULT 'AUTO_EVALUATED',
  evaluated_at DATETIME NULL,
  evaluator_id INT NULL,
  evaluator_feedback TEXT NULL,
  last_saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(attempt_id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_attempt_question (attempt_id, question_id),
  INDEX idx_resp_attempt (attempt_id)
) ENGINE=InnoDB;

-- 10. Assessment Coding Submissions Table
CREATE TABLE IF NOT EXISTS assessment_coding_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  attempt_id VARCHAR(100) NOT NULL,
  response_id INT NULL,
  user_id INT NOT NULL,
  assessment_id INT NOT NULL,
  question_id INT NOT NULL,
  problem_id INT NOT NULL,
  language VARCHAR(50) NOT NULL,
  source_code TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  test_cases_passed INT DEFAULT 0,
  total_test_cases INT DEFAULT 0,
  score DECIMAL(6,2) DEFAULT 0.00,
  runtime_ms INT DEFAULT 0,
  memory_mb VARCHAR(20) DEFAULT '0',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(attempt_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 11. Assessment Candidates / Invitations Table
CREATE TABLE IF NOT EXISTS assessment_candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT NOT NULL,
  user_id INT NULL,
  email VARCHAR(255) NOT NULL,
  invite_code VARCHAR(100) UNIQUE NOT NULL,
  status ENUM('INVITED', 'REGISTERED', 'NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'EXPIRED', 'DISQUALIFIED') DEFAULT 'INVITED',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_cand_assessment (assessment_id),
  INDEX idx_cand_email (email)
) ENGINE=InnoDB;

-- 12. Assessment Manual Evaluations Audit Table
CREATE TABLE IF NOT EXISTS assessment_evaluations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  attempt_id VARCHAR(100) NOT NULL,
  question_id INT NOT NULL,
  evaluator_id INT NOT NULL,
  previous_score DECIMAL(6,2) DEFAULT 0.00,
  new_score DECIMAL(6,2) NOT NULL,
  feedback TEXT,
  reason VARCHAR(255),
  evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(attempt_id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE,
  FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 13. Assessment Integrity Violations Log Table
CREATE TABLE IF NOT EXISTS assessment_violations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  attempt_id VARCHAR(100) NOT NULL,
  user_id INT NOT NULL,
  assessment_id INT NOT NULL,
  violation_type VARCHAR(100) NOT NULL, -- 'TAB_SWITCH', 'WINDOW_BLUR', 'COPY_PASTE', 'TIME_ANOMALY', 'RAPID_SUBMISSION'
  details JSON NULL,
  status ENUM('PENDING_REVIEW', 'UNDER_INVESTIGATION', 'CLEARED', 'WARNING_ISSUED', 'DISQUALIFIED') DEFAULT 'PENDING_REVIEW',
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(attempt_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  INDEX idx_viol_attempt (attempt_id),
  INDEX idx_viol_user (user_id)
) ENGINE=InnoDB;

-- 14. Assessment Audit Logs Table
CREATE TABLE IF NOT EXISTS assessment_audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_id INT NULL,
  action VARCHAR(100) NOT NULL,
  assessment_id INT NULL,
  candidate_id INT NULL,
  details JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 15. Assessment Certificates Table
CREATE TABLE IF NOT EXISTS assessment_certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  attempt_id VARCHAR(100) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  assessment_id INT NOT NULL,
  verification_code VARCHAR(100) UNIQUE NOT NULL,
  certificate_title VARCHAR(255) NOT NULL,
  issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(attempt_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 16. Platform Milestone Certificates Table
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

-- 17. Achievement Configurations Table
CREATE TABLE IF NOT EXISTS achievement_configs (
  milestone INT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  theme VARCHAR(50) NOT NULL,
  motivation_message TEXT NOT NULL,
  description_template TEXT NOT NULL,
  is_enabled TINYINT(1) DEFAULT 1
) ENGINE=InnoDB;

-- Pre-seed achievement configurations
INSERT INTO achievement_configs (milestone, title, theme, motivation_message, description_template, is_enabled)
VALUES 
  (5, '5 Problems Solved', 'bronze', 'Every expert was once a beginner.', 'This certificate is presented to {userName} in appreciation of successfully solving 5 accepted coding problems on CodeArena.', 1),
  (30, '30 Problems Solved', 'blue', 'Small steps build great developers.', 'This certificate is presented to {userName} in appreciation of successfully solving 30 accepted coding problems on CodeArena.', 1),
  (50, '50 Problems Solved', 'emerald', 'Consistency turns effort into progress.', 'This certificate is presented to {userName} in appreciation of successfully solving 50 accepted coding problems on CodeArena.', 1),
  (100, '100 Problems Solved', 'purple', 'Better code. Brighter future.', 'This certificate is presented to {userName} in appreciation of successfully solving 100 accepted coding problems on CodeArena.', 1),
  (120, '120 Problems Solved', 'orange', 'More practice. More possibilities.', 'This certificate is presented to {userName} in appreciation of successfully solving 120 accepted coding problems on CodeArena.', 1),
  (150, '150 Problems Solved', 'teal', 'Solve. Learn. Grow.', 'This certificate is presented to {userName} in appreciation of successfully solving 150 accepted coding problems on CodeArena.', 1),
  (200, '200 Problems Solved', 'indigo', 'Great problem solvers build the future.', 'This certificate is presented to {userName} in appreciation of successfully solving 200 accepted coding problems on CodeArena.', 1)
ON DUPLICATE KEY UPDATE 
  title = VALUES(title), 
  theme = VALUES(theme), 
  motivation_message = VALUES(motivation_message), 
  description_template = VALUES(description_template);


-- ==============================================================
-- 18. COURSE SYSTEM TABLES
-- ==============================================================

-- 18a. Courses Table
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

-- 18b. Course Modules Table
CREATE TABLE IF NOT EXISTS course_modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 18c. Course Lessons Table
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

-- 18d. Course Enrollments Table
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

-- 18e. Course Progress Table
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

-- 18f. Course Certificates Table
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

-- ==============================================================
-- 19. TRANSACTIONAL EMAIL SYSTEM TABLES
-- ==============================================================

CREATE TABLE IF NOT EXISTS email_logs (
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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE NOT NULL,
  email_notifications_enabled TINYINT(1) DEFAULT 1,
  marketing_emails_enabled TINYINT(1) DEFAULT 1,
  assessment_updates_enabled TINYINT(1) DEFAULT 1,
  contest_updates_enabled TINYINT(1) DEFAULT 1,
  course_updates_enabled TINYINT(1) DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;



