import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  runApp(const EduPulseApp());
}

class EduPulseApp extends StatelessWidget {
  const EduPulseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EduPulse Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF6366F1),
          secondary: Color(0xFF38BDF8),
          surface: Color(0xFF1E293B),
        ),
        useMaterial3: true,
      ),
      home: const SplashScreen(),
    );
  }
}

const String kApiBaseUrl = 'https://edgepluse-qhy3.vercel.app/api';

class ApiService {
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('ep_token');
  }

  static Future<void> saveToken(String token, String userName) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('ep_token', token);
    await prefs.setString('ep_user', userName);
  }

  static Future<void> clearAuth() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('ep_token');
    await prefs.remove('ep_user');
  }

  static Future<Map<String, dynamic>> login(String username, String password) async {
    final res = await http.post(
      Uri.parse('$kApiBaseUrl/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': username, 'password': password}),
    );
    final data = jsonDecode(res.body);
    if (res.statusCode == 200 && data['token'] != null) {
      await saveToken(data['token'], data['user']['name'] ?? username);
      return data;
    }
    throw Exception(data['error'] ?? 'Login failed');
  }

  static Future<List<dynamic>> getStudents() async {
    final token = await getToken();
    final res = await http.get(
      Uri.parse('$kApiBaseUrl/students'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    throw Exception('Failed to load students');
  }

  static Future<Map<String, dynamic>> getMeta() async {
    final token = await getToken();
    final res = await http.get(
      Uri.parse('$kApiBaseUrl/meta'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    throw Exception('Failed to load meta');
  }

  static Future<List<dynamic>> getReport(String type) async {
    final token = await getToken();
    final res = await http.get(
      Uri.parse('$kApiBaseUrl/reports/$type'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    throw Exception('Failed to load report: $type');
  }
}

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkLogin();
  }

  Future<void> _checkLogin() async {
    await Future.delayed(const Duration(milliseconds: 1200));
    final token = await ApiService.getToken();
    if (!mounted) return;
    if (token != null) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const MainScreen()),
      );
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const LinearGradient(
                  colors: [Color(0xFF6366F1), Color(0xFF38BDF8)],
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF6366F1).withOpacity(0.5),
                    blurRadius: 30,
                    spreadRadius: 5,
                  )
                ],
              ),
              child: const Icon(Icons.school, size: 54, color: Colors.white),
            ),
            const SizedBox(height: 24),
            const Text(
              'EduPulse',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.2,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Institutional Student Analytics & Alerts',
              style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 14),
            ),
            const SizedBox(height: 32),
            const CircularProgressIndicator(color: Color(0xFF38BDF8)),
          ],
        ),
      ),
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController(text: 'admin');
  final _passwordController = TextEditingController(text: 'admin123');
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handleLogin() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ApiService.login(
        _usernameController.text.trim(),
        _passwordController.text.trim(),
      );
      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const MainScreen()),
      );
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF6366F1).withOpacity(0.2),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF6366F1).withOpacity(0.4)),
                ),
                child: const Icon(Icons.analytics, size: 48, color: Color(0xFF818CF8)),
              ),
              const SizedBox(height: 16),
              const Text(
                'EduPulse Mobile',
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 6),
              const Text(
                'Cloud Backend & MongoDB Atlas Connected',
                style: TextStyle(fontSize: 12.5, color: Color(0xFF34D399)),
              ),
              const SizedBox(height: 28),
              if (_errorMessage != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.withOpacity(0.4)),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 13),
                  ),
                ),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B).withOpacity(0.8),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                ),
                child: Column(
                  children: [
                    TextField(
                      controller: _usernameController,
                      decoration: const InputDecoration(
                        labelText: 'Username',
                        prefixIcon: Icon(Icons.person, color: Color(0xFF818CF8)),
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _passwordController,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: 'Password',
                        prefixIcon: Icon(Icons.lock, color: Color(0xFF818CF8)),
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF6366F1),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: _isLoading ? null : _handleLogin,
                        child: _isLoading
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Text('Sign In to Dashboard', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Backend API: edgepluse-qhy3.vercel.app',
                style: TextStyle(fontSize: 11, color: Colors.white.withOpacity(0.4)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;

  final List<Widget> _pages = const [
    DashboardTab(),
    StudentsTab(),
    AttendanceTab(),
    MarksTab(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF6366F1).withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.school, size: 20, color: Color(0xFF818CF8)),
            ),
            const SizedBox(width: 10),
            const Text('EduPulse', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, size: 20),
            onPressed: () async {
              await ApiService.clearAuth();
              if (!mounted) return;
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (_) => const LoginScreen()),
              );
            },
          ),
        ],
      ),
      body: _pages[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        backgroundColor: const Color(0xFF0F172A),
        indicatorColor: const Color(0xFF6366F1).withOpacity(0.3),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.people_outline), selectedIcon: Icon(Icons.people), label: 'Students'),
          NavigationDestination(icon: Icon(Icons.check_circle_outline), selectedIcon: Icon(Icons.check_circle), label: 'Attendance'),
          NavigationDestination(icon: Icon(Icons.grade_outlined), selectedIcon: Icon(Icons.grade), label: 'Marks'),
        ],
      ),
    );
  }
}

class DashboardTab extends StatefulWidget {
  const DashboardTab({super.key});

  @override
  State<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<DashboardTab> {
  bool _loading = true;
  Map<String, dynamic>? _meta;
  List<dynamic> _students = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final meta = await ApiService.getMeta();
      final students = await ApiService.getStudents();
      setState(() {
        _meta = meta;
        _students = students;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)));
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF1E293B), Color(0xFF0F172A)]),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF34D399).withOpacity(0.4)),
            ),
            child: Row(
              children: [
                const Icon(Icons.cloud_done, color: Color(0xFF34D399), size: 28),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Cloud Database Connected',
                        style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14),
                      ),
                      Text(
                        '${_meta?['database'] ?? 'MongoDB Atlas'} (${_meta?['mongo_connected'] == true ? 'Online' : 'Synchronized'})',
                        style: const TextStyle(color: Color(0xFF34D399), fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _statCard('Total Students', '${_students.length}', Icons.groups, const Color(0xFF818CF8)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _statCard('Department', 'MCA', Icons.computer, const Color(0xFF38BDF8)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _statCard('Subjects', '5 Subjects', Icons.menu_book, const Color(0xFFFBBF24)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _statCard('Exam Cycle', 'CAT-1', Icons.event_available, const Color(0xFF34D399)),
              ),
            ],
          ),
          const SizedBox(height: 20),
          const Text('Recent MCA Roster', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 10),
          ..._students.take(8).map((s) => Card(
                color: const Color(0xFF1E293B).withOpacity(0.6),
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: const Color(0xFF6366F1).withOpacity(0.2),
                    child: Text(
                      (s['student_name'] as String? ?? 'S').substring(0, 1),
                      style: const TextStyle(color: Color(0xFF818CF8), fontWeight: FontWeight.bold),
                    ),
                  ),
                  title: Text(s['student_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text('Roll: ${s['register_no']} • Year ${s['year']} Sec ${s['section']}'),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF34D399).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text('MCA', style: TextStyle(color: Color(0xFF34D399), fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ),
              )),
        ],
      ),
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withOpacity(0.7),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 10),
          Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12)),
        ],
      ),
    );
  }
}

class StudentsTab extends StatefulWidget {
  const StudentsTab({super.key});

  @override
  State<StudentsTab> createState() => _StudentsTabState();
}

class _StudentsTabState extends State<StudentsTab> {
  List<dynamic> _students = [];
  List<dynamic> _filtered = [];
  bool _loading = true;
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchStudents();
  }

  Future<void> _fetchStudents() async {
    try {
      final list = await ApiService.getStudents();
      setState(() {
        _students = list;
        _filtered = list;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onSearch(String query) {
    setState(() {
      _filtered = _students.where((s) {
        final name = (s['student_name'] ?? '').toString().toLowerCase();
        final roll = (s['register_no'] ?? '').toString().toLowerCase();
        return name.contains(query.toLowerCase()) || roll.contains(query.toLowerCase());
      }).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: _searchCtrl,
            onChanged: _onSearch,
            decoration: InputDecoration(
              hintText: 'Search student name or roll number...',
              prefixIcon: const Icon(Icons.search, color: Color(0xFF818CF8)),
              filled: true,
              fillColor: const Color(0xFF1E293B),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            ),
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _filtered.length,
                  itemBuilder: (context, i) {
                    final s = _filtered[i];
                    return Card(
                      color: const Color(0xFF1E293B).withOpacity(0.7),
                      margin: const EdgeInsets.only(bottom: 10),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: const Color(0xFF6366F1).withOpacity(0.2),
                          child: Text(
                            (s['student_name'] as String? ?? 'S').substring(0, 1),
                            style: const TextStyle(color: Color(0xFF818CF8), fontWeight: FontWeight.bold),
                          ),
                        ),
                        title: Text(s['student_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('Roll No: ${s['register_no']} • Dept: ${s['department']}'),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('Year ${s['year']}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            Text('Sec ${s['section']}', style: TextStyle(fontSize: 11, color: Colors.white.withOpacity(0.6))),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class AttendanceTab extends StatefulWidget {
  const AttendanceTab({super.key});

  @override
  State<AttendanceTab> createState() => _AttendanceTabState();
}

class _AttendanceTabState extends State<AttendanceTab> {
  bool _loading = true;
  List<dynamic> _roster = [];

  @override
  void initState() {
    super.initState();
    _loadReport();
  }

  Future<void> _loadReport() async {
    try {
      final list = await ApiService.getReport('attendance');
      setState(() {
        _roster = list;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _roster.length,
      itemBuilder: (context, i) {
        final r = _roster[i];
        final pct = (r['attendance_pct'] ?? 0).toDouble();
        final isLow = pct < 75.0;

        return Card(
          color: const Color(0xFF1E293B).withOpacity(0.7),
          margin: const EdgeInsets.only(bottom: 10),
          child: ListTile(
            title: Text(r['student_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('Roll: ${r['register_no']} • Present: ${r['present']} / ${r['days']} days'),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: (isLow ? Colors.amber : const Color(0xFF34D399)).withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: (isLow ? Colors.amber : const Color(0xFF34D399)).withOpacity(0.5)),
              ),
              child: Text(
                '$pct%',
                style: TextStyle(
                  color: isLow ? Colors.amber : const Color(0xFF34D399),
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class MarksTab extends StatefulWidget {
  const MarksTab({super.key});

  @override
  State<MarksTab> createState() => _MarksTabState();
}

class _MarksTabState extends State<MarksTab> {
  bool _loading = true;
  List<dynamic> _marks = [];

  @override
  void initState() {
    super.initState();
    _loadMarks();
  }

  Future<void> _loadMarks() async {
    try {
      final list = await ApiService.getReport('marks');
      setState(() {
        _marks = list;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _marks.length,
      itemBuilder: (context, i) {
        final m = _marks[i];
        final isPass = m['result'] == 'Pass';

        return Card(
          color: const Color(0xFF1E293B).withOpacity(0.7),
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            title: Text('${m['student_name']} (${m['register_no']})', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            subtitle: Text('${m['subject']} • ${m['exam']}: ${m['mark']} / ${m['max_mark']} (${m['percentage']}%)'),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: (isPass ? const Color(0xFF34D399) : Colors.red).withOpacity(0.2),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                isPass ? 'Pass' : 'Fail',
                style: TextStyle(
                  color: isPass ? const Color(0xFF34D399) : Colors.red,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
