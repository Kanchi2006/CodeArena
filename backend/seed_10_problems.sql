-- ============================================================================
-- CodeArena Database Seed Script: 10 Classic LeetCode-Style Problems
-- Run against MySQL / MariaDB database `codearena_db`
-- ============================================================================

USE codearena_db;

-- Clear previous sample records if re-seeding
-- TRUNCATE TABLE problems;

INSERT INTO problems (
  title, 
  difficulty, 
  category, 
  description, 
  constraints, 
  input_format, 
  output_format, 
  sample_input, 
  sample_output, 
  test_cases, 
  starter_code
)
VALUES
(
  'Two Sum',
  'Easy',
  'Arrays & Hashing',
  'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have **exactly one solution**, and you may not use the same element twice.\n\nYou can return the answer in any order.',
  '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.',
  'First line: Space-separated integers representing array nums\nSecond line: An integer target',
  'Space-separated 0-indexed integer indices',
  '2 7 11 15\n9',
  '0 1',
  '[{"input": "2 7 11 15\\n9", "expected": "0 1"}, {"input": "3 2 4\\n6", "expected": "1 2"}, {"input": "3 3\\n6", "expected": "0 1"}]',
  '{"javascript": "function twoSum(nums, target) {\\n    const map = new Map();\\n    for (let i = 0; i < nums.length; i++) {\\n        const diff = target - nums[i];\\n        if (map.has(diff)) return [map.get(diff), i];\\n        map.set(nums[i], i);\\n    }\\n    return [];\\n};", "python": "class Solution:\\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\\n        prevMap = {}\\n        for i, n in enumerate(nums):\\n            diff = target - n\\n            if diff in prevMap:\\n                return [prevMap[diff], i]\\n            prevMap[n] = i\\n        return []", "cpp": "class Solution {\\npublic:\\n    vector<int> twoSum(vector<int>& nums, int target) {\\n        unordered_map<int, int> mp;\\n        for (int i = 0; i < nums.size(); i++) {\\n            int diff = target - nums[i];\\n            if (mp.count(diff)) return {mp[diff], i};\\n            mp[nums[i]] = i;\\n        }\\n        return {};\\n    }\\n};", "java": "class Solution {\\n    public int[] twoSum(int[] nums, int target) {\\n        Map<Integer, Integer> map = new HashMap<>();\\n        for (int i = 0; i < nums.length; i++) {\\n            int diff = target - nums[i];\\n            if (map.containsKey(diff)) return new int[] { map.get(diff), i };\\n            map.put(nums[i], i);\\n        }\\n        return new int[] {};\\n    }\\n}"}'
),
(
  'Valid Parentheses',
  'Easy',
  'Stacks',
  'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.',
  '1 <= s.length <= 10^4\ns consists of parentheses only: ()[]{}',
  'A single line containing the string s',
  'true or false',
  '()[]{}',
  'true',
  '[{"input": "()[]{}", "expected": "true"}, {"input": "([)]", "expected": "false"}, {"input": "{[]}", "expected": "true"}, {"input": "(", "expected": "false"}]',
  '{"javascript": "function isValid(s) {\\n    const stack = [];\\n    const pairs = { \')\': \'(\', \'}\': \'{\', \']\': \'[\' };\\n    for (let char of s) {\\n        if (pairs[char]) {\\n            if (stack.pop() !== pairs[char]) return false;\\n        } else stack.push(char);\\n    }\\n    return stack.length === 0;\\n};", "python": "class Solution:\\n    def isValid(self, s: str) -> bool:\\n        stack = []\\n        closeToOpen = {\")\": \"(\", \"]\": \"[\", \"}\": \"{\"}\\n        for c in s:\\n            if c in closeToOpen:\\n                if stack and stack[-1] == closeToOpen[c]:\\n                    stack.pop()\\n                else:\\n                    return False\\n            else:\\n                stack.append(c)\\n        return True if not stack else False", "cpp": "class Solution {\\npublic:\\n    bool isValid(string s) {\\n        stack<char> st;\\n        for (char c : s) {\\n            if (c == \'(\' || c == \'{\' || c == \'[\') st.push(c);\\n            else {\\n                if (st.empty()) return false;\\n                char top = st.top(); st.pop();\\n                if ((c == \')\' && top != \'(\') || (c == \'}\' && top != \'{\') || (c == \']\' && top != \'[\')) return false;\\n            }\\n        }\\n        return st.empty();\\n    }\\n};", "java": "class Solution {\\n    public boolean isValid(String s) {\\n        Stack<Character> stack = new Stack<>();\\n        for (char c : s.toCharArray()) {\\n            if (c == \'(\') stack.push(\')\');\\n            else if (c == \'{\') stack.push(\'}\');\\n            else if (c == \'[\') stack.push(\']\');\\n            else if (stack.isEmpty() || stack.pop() != c) return false;\\n        }\\n        return stack.isEmpty();\\n    }\\n}"}'
),
(
  'Merge Two Sorted Lists',
  'Easy',
  'Linked Lists',
  'You are given the heads of two sorted linked lists `list1` and `list2`.\n\nMerge the two lists into one **sorted** list. The list should be made by splicing together the nodes of the first two lists.\n\nReturn the head of the merged linked list.',
  'The number of nodes in both lists is in the range [0, 50].\n-100 <= Node.val <= 100\nBoth list1 and list2 are sorted in non-decreasing order.',
  'First line: Space-separated integers for list1\nSecond line: Space-separated integers for list2',
  'Space-separated merged sorted list node values',
  '1 2 4\n1 3 4',
  '1 1 2 3 4 4',
  '[{"input": "1 2 4\\n1 3 4", "expected": "1 1 2 3 4 4"}, {"input": "\\n0", "expected": "0"}, {"input": "\\n", "expected": ""}]',
  '{"javascript": "function mergeTwoLists(list1, list2) {\\n    const dummy = new ListNode(0);\\n    let curr = dummy;\\n    while (list1 && list2) {\\n        if (list1.val < list2.val) { curr.next = list1; list1 = list1.next; }\\n        else { curr.next = list2; list2 = list2.next; }\\n        curr = curr.next;\\n    }\\n    curr.next = list1 || list2;\\n    return dummy.next;\\n};", "python": "class Solution:\\n    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:\\n        dummy = ListNode()\\n        tail = dummy\\n        while list1 and list2:\\n            if list1.val < list2.val:\\n                tail.next = list1\\n                list1 = list1.next\\n            else:\\n                tail.next = list2\\n                list2 = list2.next\\n            tail = tail.next\\n        tail.next = list1 or list2\\n        return dummy.next", "cpp": "class Solution {\\npublic:\\n    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {\\n        if (!list1) return list2;\\n        if (!list2) return list1;\\n        if (list1->val < list2->val) {\\n            list1->next = mergeTwoLists(list1->next, list2);\\n            return list1;\\n        } else {\\n            list2->next = mergeTwoLists(list1, list2->next);\\n            return list2;\\n        }\\n    }\\n};", "java": "class Solution {\\n    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {\\n        if (list1 == null) return list2;\\n        if (list2 == null) return list1;\\n        if (list1.val < list2.val) {\\n            list1.next = mergeTwoLists(list1.next, list2);\\n            return list1;\\n        } else {\\n            list2.next = mergeTwoLists(list1, list2.next);\\n            return list2;\\n        }\\n    }\\n}"}'
),
(
  'Best Time to Buy and Sell Stock',
  'Easy',
  'Dynamic Programming',
  'You are given an array `prices` where `prices[i]` is the price of a given stock on the `i-th` day.\n\nYou want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return `0`.',
  '1 <= prices.length <= 10^5\n0 <= prices[i] <= 10^4',
  'Space-separated integers representing stock prices per day',
  'An integer representing maximum achievable profit',
  '7 1 5 3 6 4',
  '5',
  '[{"input": "7 1 5 3 6 4", "expected": "5"}, {"input": "7 6 4 3 1", "expected": "0"}, {"input": "1 2 4 2 5 7 2 4 9 0", "expected": "8"}]',
  '{"javascript": "function maxProfit(prices) {\\n    let minPrice = Infinity, maxProf = 0;\\n    for (let price of prices) {\\n        if (price < minPrice) minPrice = price;\\n        else if (price - minPrice > maxProf) maxProf = price - minPrice;\\n    }\\n    return maxProf;\\n};", "python": "class Solution:\\n    def maxProfit(self, prices: List[int]) -> int:\\n        l, r = 0, 1\\n        maxP = 0\\n        while r < len(prices):\\n            if prices[l] < prices[r]:\\n                profit = prices[r] - prices[l]\\n                maxP = max(maxP, profit)\\n            else:\\n                l = r\\n            r += 1\\n        return maxP", "cpp": "class Solution {\\npublic:\\n    int maxProfit(vector<int>& prices) {\\n        int minPrice = INT_MAX, maxProfit = 0;\\n        for (int p : prices) {\\n            minPrice = min(minPrice, p);\\n            maxProfit = max(maxProfit, p - minPrice);\\n        }\\n        return maxProfit;\\n    }\\n};", "java": "class Solution {\\n    public int maxProfit(int[] prices) {\\n        int minPrice = Integer.MAX_VALUE, maxProfit = 0;\\n        for (int p : prices) {\\n            if (p < minPrice) minPrice = p;\\n            else if (p - minPrice > maxProfit) maxProfit = p - minPrice;\\n        }\\n        return maxProfit;\\n    }\\n}"}'
),
(
  'Valid Palindrome',
  'Easy',
  'Two Pointers',
  'A phrase is a **palindrome** if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.\n\nGiven a string `s`, return `true` if it is a palindrome, or `false` otherwise.',
  '1 <= s.length <= 2 * 10^5\ns consists only of printable ASCII characters.',
  'A single line containing string s',
  'true or false',
  'A man, a plan, a canal: Panama',
  'true',
  '[{"input": "A man, a plan, a canal: Panama", "expected": "true"}, {"input": "race a car", "expected": "false"}, {"input": " ", "expected": "true"}]',
  '{"javascript": "function isPalindrome(s) {\\n    const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, \'\');\\n    return cleaned === cleaned.split(\'\').reverse().join(\'\');\\n};", "python": "class Solution:\\n    def isPalindrome(self, s: str) -> bool:\\n        newStr = [c.lower() for c in s if c.isalnum()]\\n        return newStr == newStr[::-1]", "cpp": "class Solution {\\npublic:\\n    bool isPalindrome(string s) {\\n        int l = 0, r = s.length() - 1;\\n        while (l < r) {\\n            while (l < r && !isalnum(s[l])) l++;\\n            while (l < r && !isalnum(s[r])) r--;\\n            if (tolower(s[l]) != tolower(s[r])) return false;\\n            l++; r--;\\n        }\\n        return true;\\n    }\\n};", "java": "class Solution {\\n    public boolean isPalindrome(String s) {\\n        int l = 0, r = s.length() - 1;\\n        while (l < r) {\\n            while (l < r && !Character.isLetterOrDigit(s.charAt(l))) l++;\\n            while (l < r && !Character.isLetterOrDigit(s.charAt(r))) r--;\\n            if (Character.toLowerCase(s.charAt(l)) != Character.toLowerCase(s.charAt(r))) return false;\\n            l++; r--;\\n        }\\n        return true;\\n    }\\n}"}'
),
(
  'Reverse Linked List',
  'Easy',
  'Linked Lists',
  'Given the `head` of a singly linked list, reverse the list, and return the reversed list.',
  'The number of nodes in the list is in the range [0, 5000].\n-5000 <= Node.val <= 5000',
  'Space-separated integers representing nodes of the linked list',
  'Space-separated node values of the reversed linked list',
  '1 2 3 4 5',
  '5 4 3 2 1',
  '[{"input": "1 2 3 4 5", "expected": "5 4 3 2 1"}, {"input": "1 2", "expected": "2 1"}, {"input": "", "expected": ""}]',
  '{"javascript": "function reverseList(head) {\\n    let prev = null, curr = head;\\n    while (curr) {\\n        let nextTemp = curr.next;\\n        curr.next = prev;\\n        prev = curr;\\n        curr = nextTemp;\\n    }\\n    return prev;\\n};", "python": "class Solution:\\n    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:\\n        prev, curr = None, head\\n        while curr:\\n            nxt = curr.next\\n            curr.next = prev\\n            prev = curr\\n            curr = nxt\\n        return prev", "cpp": "class Solution {\\npublic:\\n    ListNode* reverseList(ListNode* head) {\\n        ListNode *prev = NULL, *curr = head, *next = NULL;\\n        while (curr != NULL) {\\n            next = curr->next;\\n            curr->next = prev;\\n            prev = curr;\\n            curr = next;\\n        }\\n        return prev;\\n    }\\n};", "java": "class Solution {\\n    public ListNode reverseList(ListNode head) {\\n        ListNode prev = null;\\n        ListNode curr = head;\\n        while (curr != null) {\\n            ListNode nextTemp = curr.next;\\n            curr.next = prev;\\n            prev = curr;\\n            curr = nextTemp;\\n        }\\n        return prev;\\n    }\\n}"}'
),
(
  'Maximum Subarray',
  'Medium',
  'Dynamic Programming',
  'Given an integer array `nums`, find the contiguous subarray (containing at least one number) which has the largest sum and return *its sum*.\n\nA **subarray** is a contiguous part of an array.',
  '1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4',
  'Space-separated integers representing array nums',
  'An integer representing maximum contiguous sum',
  '-2 1 -3 4 -1 2 1 -5 4',
  '6',
  '[{"input": "-2 1 -3 4 -1 2 1 -5 4", "expected": "6"}, {"input": "1", "expected": "1"}, {"input": "5 4 -1 7 8", "expected": "23"}]',
  '{"javascript": "function maxSubArray(nums) {\\n    let maxSub = nums[0], curSum = 0;\\n    for (let n of nums) {\\n        if (curSum < 0) curSum = 0;\\n        curSum += n;\\n        maxSub = Math.max(maxSub, curSum);\\n    }\\n    return maxSub;\\n};", "python": "class Solution:\\n    def maxSubArray(self, nums: List[int]) -> int:\\n        maxSub = nums[0]\\n        curSum = 0\\n        for n in nums:\\n            if curSum < 0:\\n                curSum = 0\\n            curSum += n\\n            maxSub = max(maxSub, curSum)\\n        return maxSub", "cpp": "class Solution {\\npublic:\\n    int maxSubArray(vector<int>& nums) {\\n        int maxSub = nums[0], curSum = 0;\\n        for (int n : nums) {\\n            if (curSum < 0) curSum = 0;\\n            curSum += n;\\n            maxSub = max(maxSub, curSum);\\n        }\\n        return maxSub;\\n    }\\n};", "java": "class Solution {\\n    public int maxSubArray(int[] nums) {\\n        int maxSub = nums[0], curSum = 0;\\n        for (int n : nums) {\\n            if (curSum < 0) curSum = 0;\\n            curSum += n;\\n            maxSub = Math.max(maxSub, curSum);\\n        }\\n        return maxSub;\\n    }\\n}"}'
),
(
  'Climbing Stairs',
  'Easy',
  'Dynamic Programming',
  'You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?',
  '1 <= n <= 45',
  'An integer n representing the total steps',
  'An integer representing total distinct ways to climb',
  '3',
  '3',
  '[{"input": "2", "expected": "2"}, {"input": "3", "expected": "3"}, {"input": "5", "expected": "8"}]',
  '{"javascript": "function climbStairs(n) {\\n    let one = 1, two = 1;\\n    for (let i = 0; i < n - 1; i++) {\\n        let temp = one;\\n        one = one + two;\\n        two = temp;\\n    }\\n    return one;\\n};", "python": "class Solution:\\n    def climbStairs(self, n: int) -> int:\\n        one, two = 1, 1\\n        for i in range(n - 1):\\n            temp = one\\n            one = one + two\\n            two = temp\\n        return one", "cpp": "class Solution {\\npublic:\\n    int climbStairs(int n) {\\n        int one = 1, two = 1;\\n        for (int i = 0; i < n - 1; i++) {\\n            int temp = one;\\n            one = one + two;\\n            two = temp;\\n        }\\n        return one;\\n    }\\n};", "java": "class Solution {\\n    public int climbStairs(int n) {\\n        int one = 1, two = 1;\\n        for (int i = 0; i < n - 1; i++) {\\n            int temp = one;\\n            one = one + two;\\n            two = temp;\\n        }\\n        return one;\\n    }\\n}"}'
),
(
  'Contains Duplicate',
  'Easy',
  'Arrays & Hashing',
  'Given an integer array `nums`, return `true` if any value appears **at least twice** in the array, and return `false` if every element is distinct.',
  '1 <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9',
  'Space-separated integers representing array nums',
  'true or false',
  '1 2 3 1',
  'true',
  '[{"input": "1 2 3 1", "expected": "true"}, {"input": "1 2 3 4", "expected": "false"}, {"input": "1 1 1 3 3 4 3 2 4 2", "expected": "true"}]',
  '{"javascript": "function containsDuplicate(nums) {\\n    const set = new Set(nums);\\n    return set.size < nums.length;\\n};", "python": "class Solution:\\n    def containsDuplicate(self, nums: List[int]) -> bool:\\n        hashset = set()\\n        for n in nums:\\n            if n in hashset:\\n                return True\\n            hashset.add(n)\\n        return False", "cpp": "class Solution {\\npublic:\\n    bool containsDuplicate(vector<int>& nums) {\\n        unordered_set<int> s;\\n        for (int n : nums) {\\n            if (s.count(n)) return true;\\n            s.insert(n);\\n        }\\n        return false;\\n    }\\n};", "java": "class Solution {\\n    public boolean containsDuplicate(int[] nums) {\\n        Set<Integer> set = new HashSet<>();\\n        for (int n : nums) {\\n            if (set.contains(n)) return true;\\n            set.add(n);\\n        }\\n        return false;\\n    }\\n}"}'
),
(
  'Valid Anagram',
  'Easy',
  'Strings & Hashing',
  'Given two strings `s` and `t`, return `true` if `t` is an **anagram** of `s`, and `false` otherwise.\n\nAn **Anagram** is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.',
  '1 <= s.length, t.length <= 5 * 10^4\ns and t consist of lowercase English letters.',
  'First line: string s\nSecond line: string t',
  'true or false',
  'anagram\nnagaram',
  'true',
  '[{"input": "anagram\\nnagaram", "expected": "true"}, {"input": "rat\\ncar", "expected": "false"}]',
  '{"javascript": "function isAnagram(s, t) {\\n    if (s.length !== t.length) return false;\\n    return s.split(\'\').sort().join(\'\') === t.split(\'\').sort().join(\'\');\\n};", "python": "class Solution:\\n    def isAnagram(self, s: str, t: str) -> bool:\\n        if len(s) != len(t):\\n            return False\\n        countS, countT = {}, {}\\n        for i in range(len(s)):\\n            countS[s[i]] = 1 + countS.get(s[i], 0)\\n            countT[t[i]] = 1 + countT.get(t[i], 0)\\n        return countS == countT", "cpp": "class Solution {\\npublic:\\n    bool isAnagram(string s, string t) {\\n        if (s.length() != t.length()) return false;\\n        vector<int> count(26, 0);\\n        for (int i = 0; i < s.length(); i++) {\\n            count[s[i] - \'a\']++;\\n            count[t[i] - \'a\']--;\\n        }\\n        for (int val : count) if (val != 0) return false;\\n        return true;\\n    }\\n};", "java": "class Solution {\\n    public boolean isAnagram(String s, String t) {\\n        if (s.length() != t.length()) return false;\\n        int[] store = new int[26];\\n        for (int i = 0; i < s.length(); i++) {\\n            store[s.charAt(i) - \'a\']++;\\n            store[t.charAt(i) - \'a\']--;\\n        }\\n        for (int n : store) if (n != 0) return false;\\n        return true;\\n    }\\n}"}'
);
