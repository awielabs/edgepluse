import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
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
        scaffoldBackgroundColor: const Color(0xFF0A0F1D),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF6366F1),
          secondary: Color(0xFF38BDF8),
          surface: Color(0xFF131D31),
        ),
        cardTheme: CardThemeData(
          color: const Color(0xFF131D31).withValues(alpha: 0.8),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
          ),
        ),
        useMaterial3: true,
      ),
      home: const SplashScreen(),
    );
  }
}

const List<String> kApiBaseUrls = [
  'https://edgepluse.vercel.app/api',
  'https://edgepluse-qhy3.vercel.app/api',
];

// ==================== API SERVICE ====================
class ApiService {
  static Future<String?> getToken() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString('ep_token');
    } catch (e) {
      debugPrint('[ApiService] getToken error: $e');
      return null;
    }
  }

  static Future<void> saveAuth(String token, String userName, String role) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('ep_token', token);
      await prefs.setString('ep_user', userName);
      await prefs.setString('ep_role', role);
    } catch (e) {
      debugPrint('[ApiService] saveAuth error: $e');
    }
  }

  static Future<void> clearAuth() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('ep_token');
      await prefs.remove('ep_user');
      await prefs.remove('ep_role');
    } catch (e) {
      debugPrint('[ApiService] clearAuth error: $e');
    }
  }

  static Future<http.Response> _sendWithFallback(Future<http.Response> Function(String baseUrl) requestFn) async {
    Object? lastErr;
    for (final base in kApiBaseUrls) {
      try {
        final res = await requestFn(base);
        return res;
      } catch (e) {
        lastErr = e;
        debugPrint('[ApiService] Failover from $base: $e');
      }
    }
    throw lastErr ?? Exception('Network connection failed. Please check internet access.');
  }

  static Future<Map<String, dynamic>> login(String username, String password) async {
    final res = await _sendWithFallback((base) => http.post(
      Uri.parse('$base/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': username, 'password': password}),
    ).timeout(const Duration(seconds: 15)));

    final data = jsonDecode(res.body);
    if (res.statusCode == 200 && data['token'] != null) {
      await saveAuth(data['token'], data['user']?['name'] ?? username, data['user']?['role'] ?? 'faculty');
      return data;
    }
    throw Exception(data['error'] ?? 'Authentication failed');
  }

  static Future<dynamic> get(String endpoint) async {
    final token = await getToken();
    final res = await _sendWithFallback((base) => http.get(
      Uri.parse('$base$endpoint'),
      headers: {
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    ).timeout(const Duration(seconds: 15)));

    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    if (res.statusCode == 401) {
      await clearAuth();
      throw Exception('Session expired. Please log in again.');
    }
    final err = jsonDecode(res.body);
    throw Exception(err['error'] ?? 'Failed to load $endpoint');
  }

  static Future<dynamic> post(String endpoint, Map<String, dynamic> body) async {
    final token = await getToken();
    final res = await _sendWithFallback((base) => http.post(
      Uri.parse('$base$endpoint'),
      headers: {
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(body),
    ).timeout(const Duration(seconds: 15)));

    final data = jsonDecode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return data;
    }
    if (res.statusCode == 401) {
      await clearAuth();
      throw Exception('Session expired. Please log in again.');
    }
    throw Exception(data['error'] ?? 'Request failed');
  }
}

// ==================== SPLASH SCREEN ====================
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  bool _canSkip = false;
  bool _hasNavigated = false;

  @override
  void initState() {
    super.initState();
    _checkSession();

    // Safety fallback: allow manual bypass after 2 seconds
    Future.delayed(const Duration(milliseconds: 2000), () {
      if (mounted && !_hasNavigated) setState(() => _canSkip = true);
    });

    // Hard failsafe: guarantee screen moves to LoginScreen within 3.5 seconds
    Future.delayed(const Duration(milliseconds: 3500), () {
      if (mounted && !_hasNavigated) {
        _goToLogin();
      }
    });
  }

  void _goToLogin() {
    if (_hasNavigated || !mounted) return;
    _hasNavigated = true;
    Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  void _goToMain() {
    if (_hasNavigated || !mounted) return;
    _hasNavigated = true;
    Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const MainAppScaffold()));
  }

  Future<void> _checkSession() async {
    try {
      await Future.delayed(const Duration(milliseconds: 1000));
      final token = await ApiService.getToken();
      if (!mounted || _hasNavigated) return;
      if (token != null && token.trim().isNotEmpty) {
        _goToMain();
      } else {
        _goToLogin();
      }
    } catch (e) {
      debugPrint('[SplashScreen] error during startup check: $e');
      _goToLogin();
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
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF38BDF8)]),
                boxShadow: [
                  BoxShadow(color: const Color(0xFF6366F1).withValues(alpha: 0.4), blurRadius: 35, spreadRadius: 6),
                ],
              ),
              child: const Icon(Icons.school_rounded, size: 56, color: Colors.white),
            ),
            const SizedBox(height: 24),
            const Text('EduPulse', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, letterSpacing: 1.2, color: Colors.white)),
            const SizedBox(height: 6),
            const Text('Next-Gen Student Analytics & Alerts', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
            const SizedBox(height: 28),
            const CircularProgressIndicator(color: Color(0xFF38BDF8), strokeWidth: 2.5),
            if (_canSkip) ...[
              const SizedBox(height: 24),
              TextButton.icon(
                onPressed: _goToLogin,
                icon: const Icon(Icons.arrow_forward_rounded, size: 16, color: Color(0xFF818CF8)),
                label: const Text('Tap to continue to Login', style: TextStyle(color: Color(0xFF818CF8), fontSize: 13, fontWeight: FontWeight.w600)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ==================== LOGIN SCREEN ====================
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameCtrl = TextEditingController(text: 'admin');
  final _passwordCtrl = TextEditingController(text: 'admin123');
  bool _isLoading = false;
  String? _error;

  Future<void> _login() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      await ApiService.login(_usernameCtrl.text.trim(), _passwordCtrl.text.trim());
      if (!mounted) return;
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const MainAppScaffold()));
    } catch (e) {
      final msg = e.toString().replaceAll('Exception: ', '');
      if (msg.contains('Socket') || msg.contains('Failed host lookup') || msg.contains('errno = 7')) {
        setState(() => _error = 'Network connection error: Unable to reach EduPulse servers. Please check your internet or Wi-Fi connection.');
      } else {
        setState(() => _error = msg);
      }
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
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)]),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [BoxShadow(color: const Color(0xFF6366F1).withValues(alpha: 0.3), blurRadius: 20)],
                ),
                child: const Icon(Icons.auto_graph_rounded, size: 44, color: Colors.white),
              ),
              const SizedBox(height: 20),
              const Text('EduPulse Mobile', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 4),
              const Text('Manakula Vinayagar Institute of Technology (MCA)', style: TextStyle(fontSize: 12, color: Color(0xFF38BDF8)), textAlign: TextAlign.center),
              const SizedBox(height: 24),
              if (_error != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.red.withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.redAccent, size: 18),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_error!, style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 12.5))),
                    ],
                  ),
                ),
              Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: const Color(0xFF131D31),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                ),
                child: Column(
                  children: [
                    TextField(
                      controller: _usernameCtrl,
                      decoration: InputDecoration(
                        labelText: 'Username',
                        prefixIcon: const Icon(Icons.person_rounded, color: Color(0xFF818CF8)),
                        filled: true,
                        fillColor: const Color(0xFF0A0F1D),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: _passwordCtrl,
                      obscureText: true,
                      decoration: InputDecoration(
                        labelText: 'Password',
                        prefixIcon: const Icon(Icons.lock_rounded, color: Color(0xFF818CF8)),
                        filled: true,
                        fillColor: const Color(0xFF0A0F1D),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      ),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF6366F1),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: _isLoading ? null : _login,
                        child: _isLoading
                            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Text('Access Dashboard', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              const Text('🟢 Connected to live Vercel Cloud & MongoDB Atlas', style: TextStyle(color: Color(0xFF34D399), fontSize: 11.5)),
            ],
          ),
        ),
      ),
    );
  }
}

// ==================== MAIN SHELL (DRAWER + BOTTOM NAV) ====================
class MainAppScaffold extends StatefulWidget {
  const MainAppScaffold({super.key});

  @override
  State<MainAppScaffold> createState() => _MainAppScaffoldState();
}

class _MainAppScaffoldState extends State<MainAppScaffold> {
  int _tabIndex = 0;

  final List<Widget> _views = const [
    DashboardView(),
    StudentsView(),
    AttendanceView(),
    MarksView(),
    AttentionView(),
    ReportsView(),
    SettingsView(),
  ];

  final List<String> _titles = const [
    'Institutional Dashboard',
    'Student Directory (MCA)',
    'Roll-Call Attendance',
    'CAT-1 Examination Gradebook',
    'Students Requiring Attention',
    'Progress Reports (Bilingual)',
    'Institutional Settings',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A0F1D),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_titles[_tabIndex], style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
            const Text('MVIT • MCA Semester 3', style: TextStyle(fontSize: 11, color: Color(0xFF38BDF8))),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync_rounded, color: Color(0xFF818CF8)),
            onPressed: () {
              setState(() {});
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Refreshing live cloud data...'), duration: Duration(seconds: 1)));
            },
          ),
        ],
      ),
      drawer: Drawer(
        backgroundColor: const Color(0xFF0F172A),
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            DrawerHeader(
              decoration: const BoxDecoration(
                gradient: LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF0F172A)], begin: Alignment.topLeft, end: Alignment.bottomRight),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), shape: BoxShape.circle),
                    child: const Icon(Icons.school_rounded, color: Colors.white, size: 30),
                  ),
                  const SizedBox(height: 10),
                  const Text('EduPulse Mobile', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                  const Text('Manakula Vinayagar Institute of Technology', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                ],
              ),
            ),
            _drawerItem(0, Icons.dashboard_rounded, 'Dashboard'),
            _drawerItem(1, Icons.groups_rounded, 'Students Roster'),
            _drawerItem(2, Icons.event_available_rounded, 'Daily Attendance'),
            _drawerItem(3, Icons.grade_rounded, 'CAT-1 Marks'),
            _drawerItem(4, Icons.warning_amber_rounded, 'Needs Attention', badge: 'At Risk'),
            _drawerItem(5, Icons.assignment_rounded, 'Progress Reports', badge: 'Tamil/Eng'),
            _drawerItem(6, Icons.settings_rounded, 'Settings & Atlas'),
            const Divider(color: Colors.white12),
            ListTile(
              leading: const Icon(Icons.logout_rounded, color: Colors.redAccent),
              title: const Text('Sign Out', style: TextStyle(color: Colors.redAccent)),
              onTap: () async {
                await ApiService.clearAuth();
                if (!mounted) return;
                Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
              },
            ),
          ],
        ),
      ),
      body: _views[_tabIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tabIndex < 4 ? _tabIndex : 0,
        onDestinationSelected: (i) => setState(() => _tabIndex = i),
        backgroundColor: const Color(0xFF0A0F1D),
        indicatorColor: const Color(0xFF6366F1).withValues(alpha: 0.35),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard_rounded), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.people_outline), selectedIcon: Icon(Icons.people_rounded), label: 'Students'),
          NavigationDestination(icon: Icon(Icons.check_circle_outline), selectedIcon: Icon(Icons.check_circle_rounded), label: 'Attendance'),
          NavigationDestination(icon: Icon(Icons.grade_outlined), selectedIcon: Icon(Icons.grade_rounded), label: 'Marks'),
        ],
      ),
    );
  }

  Widget _drawerItem(int index, IconData icon, String title, {String? badge}) {
    final isSelected = _tabIndex == index;
    return ListTile(
      leading: Icon(icon, color: isSelected ? const Color(0xFF818CF8) : const Color(0xFF94A3B8)),
      title: Text(title, style: TextStyle(color: isSelected ? Colors.white : const Color(0xFF94A3B8), fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
      trailing: badge != null
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: const Color(0xFF6366F1).withValues(alpha: 0.25), borderRadius: BorderRadius.circular(6)),
              child: Text(badge, style: const TextStyle(fontSize: 10, color: Color(0xFF818CF8), fontWeight: FontWeight.bold)),
            )
          : null,
      selected: isSelected,
      onTap: () {
        setState(() => _tabIndex = index);
        Navigator.pop(context);
      },
    );
  }
}

// ==================== 1. DASHBOARD VIEW ====================
class DashboardView extends StatefulWidget {
  const DashboardView({super.key});

  @override
  State<DashboardView> createState() => _DashboardViewState();
}

class _DashboardViewState extends State<DashboardView> {
  bool _loading = true;
  List<dynamic> _students = [];
  Map<String, dynamic>? _meta;
  List<dynamic> _perf = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        ApiService.get('/students').catchError((_) => []),
        ApiService.get('/meta').catchError((_) => <String, dynamic>{}),
        ApiService.get('/reports/performance').catchError((_) => []),
      ]);
      if (mounted) {
        setState(() {
          _students = results[0] is List ? (results[0] as List) : [];
          _meta = results[1] is Map<String, dynamic> ? (results[1] as Map<String, dynamic>) : null;
          _perf = results[2] is List ? (results[2] as List) : [];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)));

    final atRiskCount = _perf.where((x) => x['status'] != 'On track').length;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Database status card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF131D31), Color(0xFF0F2624)]),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: const Color(0xFF10B981).withValues(alpha: 0.2), shape: BoxShape.circle),
                  child: const Icon(Icons.cloud_done_rounded, color: Color(0xFF34D399), size: 26),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Primary Cloud Database: MongoDB Atlas', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: Colors.white)),
                      const SizedBox(height: 2),
                      Text('Cluster: cluster0.ey3rp.mongodb.net (${_meta?['database'] ?? 'Active'})', style: const TextStyle(fontSize: 11, color: Color(0xFF34D399))),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // KPI grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.45,
            children: [
              _metricTile('Total Students', '${_students.length}', 'MCA Semester 3', Icons.people_rounded, const Color(0xFF818CF8)),
              _metricTile('Academic Risk', '$atRiskCount', 'Needs Attention', Icons.warning_rounded, const Color(0xFFF87171)),
              _metricTile('CAT-1 Subjects', '5 Active', '.NET, CC, DS, FD, MA', Icons.menu_book_rounded, const Color(0xFFFBBF24)),
              _metricTile('Parent Channels', 'Active', 'Email & SMS Alerting', Icons.notifications_active_rounded, const Color(0xFF34D399)),
            ],
          ),
          const SizedBox(height: 20),
          const Text('Top MCA Candidates', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 10),
          ..._students.take(6).map((s) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: const Color(0xFF6366F1).withValues(alpha: 0.2),
                    child: Text((s['student_name'] ?? 'S')[0], style: const TextStyle(color: Color(0xFF818CF8), fontWeight: FontWeight.bold)),
                  ),
                  title: Text(s['student_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  subtitle: Text('Roll No: ${s['register_no']} • Year ${s['year']} Sec ${s['section']}', style: const TextStyle(fontSize: 12)),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: const Color(0xFF34D399).withValues(alpha: 0.2), borderRadius: BorderRadius.circular(6)),
                    child: const Text('MCA', style: TextStyle(color: Color(0xFF34D399), fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ),
              )),
        ],
      ),
    );
  }

  Widget _metricTile(String label, String value, String sub, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF131D31),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
              Icon(icon, color: color, size: 20),
            ],
          ),
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
          Text(sub, style: TextStyle(fontSize: 10.5, color: color)),
        ],
      ),
    );
  }
}

// ==================== 2. STUDENTS VIEW ====================
class StudentsView extends StatefulWidget {
  const StudentsView({super.key});

  @override
  State<StudentsView> createState() => _StudentsViewState();
}

class _StudentsViewState extends State<StudentsView> {
  List<dynamic> _all = [];
  List<dynamic> _filtered = [];
  bool _loading = true;
  final _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    try {
      final list = await ApiService.get('/students');
      setState(() {
        _all = list;
        _filtered = list;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _filter(String q) {
    setState(() {
      _filtered = _all.where((s) {
        final name = (s['student_name'] ?? '').toString().toLowerCase();
        final roll = (s['register_no'] ?? '').toString().toLowerCase();
        return name.contains(q.toLowerCase()) || roll.contains(q.toLowerCase());
      }).toList();
    });
  }

  void _showAddDialog() {
    final nameCtrl = TextEditingController();
    final rollCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF131D31),
        title: const Text('Add Student to MCA Roster', style: TextStyle(fontSize: 16)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Student Full Name')),
              TextField(controller: rollCtrl, decoration: const InputDecoration(labelText: 'Register Number (e.g. 250160)')),
              TextField(controller: emailCtrl, decoration: const InputDecoration(labelText: 'Parent Email')),
              TextField(controller: phoneCtrl, decoration: const InputDecoration(labelText: 'Parent WhatsApp / Phone')),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1)),
            onPressed: () async {
              try {
                await ApiService.post('/students', {
                  'student_name': nameCtrl.text.trim(),
                  'register_no': rollCtrl.text.trim(),
                  'department': 'MCA',
                  'year': '3',
                  'section': 'A',
                  'parent_email': emailCtrl.text.trim(),
                  'parent_phone': phoneCtrl.text.trim(),
                });
                Navigator.pop(ctx);
                _fetch();
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Student added successfully!')));
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
              }
            },
            child: const Text('Save Student'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _search,
                  onChanged: _filter,
                  decoration: InputDecoration(
                    hintText: 'Search 50 MCA students...',
                    prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF818CF8)),
                    filled: true,
                    fillColor: const Color(0xFF131D31),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              IconButton(
                style: IconButton.styleFrom(backgroundColor: const Color(0xFF6366F1)),
                icon: const Icon(Icons.add, color: Colors.white),
                onPressed: _showAddDialog,
              ),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _filtered.length,
                  itemBuilder: (ctx, i) {
                    final s = _filtered[i];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: const Color(0xFF6366F1).withValues(alpha: 0.2),
                          child: Text((s['student_name'] ?? 'S')[0], style: const TextStyle(color: Color(0xFF818CF8), fontWeight: FontWeight.bold)),
                        ),
                        title: Text(s['student_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('Roll: ${s['register_no']} • Parent: ${s['parent_phone'] ?? s['parent_email'] ?? 'Not set'}'),
                        trailing: const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
                        onTap: () {
                          showModalBottomSheet(
                            context: context,
                            backgroundColor: const Color(0xFF131D31),
                            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
                            builder: (_) => Padding(
                              padding: const EdgeInsets.all(20),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(s['student_name'], style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 6),
                                  Text('Register No: ${s['register_no']} • Department: ${s['department']}'),
                                  Text('Parent Email: ${s['parent_email']}'),
                                  Text('Parent Phone: ${s['parent_phone']}'),
                                  const SizedBox(height: 16),
                                  SizedBox(
                                    width: double.infinity,
                                    child: ElevatedButton.icon(
                                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                                      icon: const Icon(Icons.phone_forwarded, color: Colors.white),
                                      label: const Text('Contact Parent via WhatsApp'),
                                      onPressed: () => Navigator.pop(context),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

// ==================== 3. ATTENDANCE VIEW ====================
class AttendanceView extends StatefulWidget {
  const AttendanceView({super.key});

  @override
  State<AttendanceView> createState() => _AttendanceViewState();
}

class _AttendanceViewState extends State<AttendanceView> {
  bool _loading = true;
  List<dynamic> _students = [];
  final Map<int, String> _status = {};
  String _date = DateTime.now().toIso8601String().substring(0, 10);

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final list = await ApiService.get('/students');
      setState(() {
        _students = list;
        for (var s in list) {
          _status[s['id']] = 'Present';
        }
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    final records = _status.entries.map((e) => {'student_id': e.key, 'status': e.value}).toList();
    try {
      await ApiService.post('/attendance', {'date': _date, 'records': records});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Attendance recorded and synced to MongoDB Atlas!')));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)));

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          color: const Color(0xFF131D31),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Date: $_date', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF38BDF8))),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1)),
                icon: const Icon(Icons.cloud_upload_rounded, size: 16),
                label: const Text('Save Roll-Call'),
                onPressed: _submit,
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _students.length,
            itemBuilder: (ctx, i) {
              final s = _students[i];
              final isPresent = _status[s['id']] == 'Present';

              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  title: Text(s['student_name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  subtitle: Text('Roll: ${s['register_no']} • MCA Sem 3'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ChoiceChip(
                        label: const Text('Present'),
                        selected: isPresent,
                        selectedColor: const Color(0xFF10B981),
                        onSelected: (_) => setState(() => _status[s['id']] = 'Present'),
                      ),
                      const SizedBox(width: 6),
                      ChoiceChip(
                        label: const Text('Absent'),
                        selected: !isPresent,
                        selectedColor: Colors.redAccent,
                        onSelected: (_) => setState(() => _status[s['id']] = 'Absent'),
                      ),
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

// ==================== 4. MARKS VIEW ====================
class MarksView extends StatefulWidget {
  const MarksView({super.key});

  @override
  State<MarksView> createState() => _MarksViewState();
}

class _MarksViewState extends State<MarksView> {
  bool _loading = true;
  List<dynamic> _marks = [];
  String _selectedSubject = 'All';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final list = await ApiService.get('/reports/marks');
      setState(() {
        _marks = list;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)));

    final subjects = ['All', 'DS', '.NET', 'FD', 'CC', 'MA'];
    final filtered = _selectedSubject == 'All' ? _marks : _marks.where((m) => m['subject'] == _selectedSubject).toList();

    return Column(
      children: [
        SizedBox(
          height: 48,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            children: subjects.map((sub) {
              final isSel = _selectedSubject == sub;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: FilterChip(
                  label: Text(sub),
                  selected: isSel,
                  selectedColor: const Color(0xFF6366F1),
                  onSelected: (_) => setState(() => _selectedSubject = sub),
                ),
              );
            }).toList(),
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: filtered.length,
            itemBuilder: (ctx, i) {
              final m = filtered[i];
              final isPass = m['result'] == 'Pass';

              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  title: Text('${m['student_name']} (${m['register_no']})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
                  subtitle: Text('Subject: ${m['subject']} • Exam: ${m['exam']}'),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: (isPass ? const Color(0xFF10B981) : Colors.redAccent).withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '${m['mark']} / ${m['max_mark']} (${m['percentage']}%)',
                      style: TextStyle(color: isPass ? const Color(0xFF34D399) : Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 12),
                    ),
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

// ==================== 5. ATTENTION / RISK MONITOR ====================
class AttentionView extends StatefulWidget {
  const AttentionView({super.key});

  @override
  State<AttentionView> createState() => _AttentionViewState();
}

class _AttentionViewState extends State<AttentionView> {
  bool _loading = true;
  List<dynamic> _riskList = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final list = await ApiService.get('/reports/performance');
      final atRisk = list.where((x) => x['status'] != 'On track').toList();
      setState(() {
        _riskList = atRisk;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sendAlert(int studentId, String name) async {
    try {
      await ApiService.post('/notifications/send-attention/$studentId', {});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Parent alert queued for $name!')));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.red.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
          ),
          child: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Colors.redAccent, size: 24),
              SizedBox(width: 10),
              Expanded(
                child: Text('Deterministic Heuristic Rules Active: Low Attendance (<75%) or Low Marks (<50%)', style: TextStyle(fontSize: 12, color: Color(0xFFFCA5A5))),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        ..._riskList.map((s) => Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(s['student_name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(6)),
                          child: Text(s['status'], style: const TextStyle(color: Colors.redAccent, fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text('Roll No: ${s['register_no']} • Attendance: ${s['attendance_pct']}% • Avg Marks: ${s['average_mark_pct']}%', style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
                        icon: const Icon(Icons.send_rounded, size: 16, color: Colors.white),
                        label: const Text('Send Urgent Parent Alert', style: TextStyle(fontSize: 12.5)),
                        onPressed: () => _sendAlert(s['id'] ?? 1, s['student_name']),
                      ),
                    ),
                  ],
                ),
              ),
            )),
      ],
    );
  }
}

// ==================== 6. PROGRESS REPORTS (BILINGUAL) ====================
class ReportsView extends StatefulWidget {
  const ReportsView({super.key});

  @override
  State<ReportsView> createState() => _ReportsViewState();
}

class _ReportsViewState extends State<ReportsView> {
  bool _loading = true;
  List<dynamic> _students = [];
  Map<String, dynamic>? _selected;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final list = await ApiService.get('/students');
      setState(() {
        _students = list;
        if (list.isNotEmpty) _selected = list[0];
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        DropdownButtonFormField<dynamic>(
          value: _selected,
          decoration: const InputDecoration(labelText: 'Select Student for CAT-1 Report', border: OutlineInputBorder()),
          items: _students.map((s) => DropdownMenuItem(value: s, child: Text('${s['student_name']} (${s['register_no']})'))).toList(),
          onChanged: (val) => setState(() => _selected = val),
        ),
        const SizedBox(height: 16),
        if (_selected != null)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.3), blurRadius: 10)],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const Text('MANAKULA VINAYAGAR INSTITUTE OF TECHNOLOGY', style: TextStyle(color: Color(0xFF1E293B), fontWeight: FontWeight.bold, fontSize: 13), textAlign: TextAlign.center),
                const Text('Kalitheerthalkuppam, Puducherry - 605 107', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                const Divider(height: 20, color: Color(0xFFCBD5E1)),
                const Text('CAT-1 PROGRESS REPORT • MCA SEMESTER 3', style: TextStyle(color: Color(0xFF4338CA), fontWeight: FontWeight.bold, fontSize: 12)),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Student: ${_selected!['student_name']}', style: const TextStyle(color: Colors.black87, fontWeight: FontWeight.bold)),
                    Text('Roll: ${_selected!['register_no']}', style: const TextStyle(color: Colors.black87)),
                  ],
                ),
                const SizedBox(height: 14),
                Table(
                  border: TableBorder.all(color: const Color(0xFFE2E8F0)),
                  children: const [
                    TableRow(decoration: BoxDecoration(color: Color(0xFFF1F5F9)), children: [
                      Padding(padding: EdgeInsets.all(6), child: Text('Subject', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87, fontSize: 11))),
                      Padding(padding: EdgeInsets.all(6), child: Text('Max', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87, fontSize: 11))),
                      Padding(padding: EdgeInsets.all(6), child: Text('Mark', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87, fontSize: 11))),
                      Padding(padding: EdgeInsets.all(6), child: Text('Result', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87, fontSize: 11))),
                    ]),
                    TableRow(children: [Padding(padding: EdgeInsets.all(6), child: Text('Data Structures', style: TextStyle(color: Colors.black87, fontSize: 11))), Padding(padding: EdgeInsets.all(6), child: Text('50', style: TextStyle(color: Colors.black87, fontSize: 11))), Padding(padding: EdgeInsets.all(6), child: Text('44', style: TextStyle(color: Colors.black87, fontSize: 11))), Padding(padding: EdgeInsets.all(6), child: Text('Pass', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 11)))]),
                    TableRow(children: [Padding(padding: EdgeInsets.all(6), child: Text('.NET Programming', style: TextStyle(color: Colors.black87, fontSize: 11))), Padding(padding: EdgeInsets.all(6), child: Text('50', style: TextStyle(color: Colors.black87, fontSize: 11))), Padding(padding: EdgeInsets.all(6), child: Text('42', style: TextStyle(color: Colors.black87, fontSize: 11))), Padding(padding: EdgeInsets.all(6), child: Text('Pass', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 11)))]),
                    TableRow(children: [Padding(padding: EdgeInsets.all(6), child: Text('Full Stack Dev', style: TextStyle(color: Colors.black87, fontSize: 11))), Padding(padding: EdgeInsets.all(6), child: Text('50', style: TextStyle(color: Colors.black87, fontSize: 11))), Padding(padding: EdgeInsets.all(6), child: Text('40', style: TextStyle(color: Colors.black87, fontSize: 11))), Padding(padding: EdgeInsets.all(6), child: Text('Pass', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 11)))]),
                    TableRow(children: [Padding(padding: EdgeInsets.all(6), child: Text('Cloud Computing', style: TextStyle(color: Colors.black87, fontSize: 11))), Padding(padding: EdgeInsets.all(6), child: Text('50', style: TextStyle(color: Colors.black87, fontSize: 11))), Padding(padding: EdgeInsets.all(6), child: Text('45', style: TextStyle(color: Colors.black87, fontSize: 11))), Padding(padding: EdgeInsets.all(6), child: Text('Pass', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 11)))]),
                    TableRow(children: [Padding(padding: EdgeInsets.all(6), child: Text('Mobile Applications', style: TextStyle(color: Colors.black87, fontSize: 11))), Padding(padding: EdgeInsets.all(6), child: Text('50', style: TextStyle(color: Colors.black87, fontSize: 11))), Padding(padding: EdgeInsets.all(6), child: Text('38', style: TextStyle(color: Colors.black87, fontSize: 11))), Padding(padding: EdgeInsets.all(6), child: Text('Pass', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 11)))]),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(8)),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Faculty Remarks / கருத்துக்கள்:', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF334155), fontSize: 11.5)),
                      SizedBox(height: 4),
                      Text('• English: Outstanding consistent academic performance. Keep it up!', style: TextStyle(color: Color(0xFF475569), fontSize: 11)),
                      Text('• தமிழ்: சிறப்பான கல்வித்திறன். தொடர்ந்து இதே முயற்சியைத் தொடரவும்.', style: TextStyle(color: Color(0xFF475569), fontSize: 11)),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF25D366),
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(Icons.chat_bubble_rounded, size: 18),
                        label: const Text('Send WhatsApp', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        onPressed: _sendWhatsApp,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF6366F1),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: _sendingEmail
                            ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Icon(Icons.email_rounded, size: 18),
                        label: Text(_sendingEmail ? 'Sending...' : 'Send Email', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        onPressed: _sendingEmail ? null : _sendEmail,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
      ],
    );
  }

  bool _sendingEmail = false;

  Future<void> _sendEmail() async {
    if (_selected == null) return;
    setState(() => _sendingEmail = true);
    try {
      final res = await ApiService.post('/notifications/send-report/${_selected!['id']}', {'channel': 'email'});
      if (!mounted) return;
      final emailResult = res['email_result'] ?? {};
      final msg = emailResult['sent'] == true
          ? 'Email dispatched to ${emailResult['recipient']}'
          : (emailResult['error'] ?? 'Failed to send');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(msg),
          backgroundColor: emailResult['sent'] == true ? Colors.green : Colors.redAccent,
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: Colors.redAccent));
      }
    } finally {
      if (mounted) setState(() => _sendingEmail = false);
    }
  }

  Future<void> _sendWhatsApp() async {
    if (_selected == null) return;
    try {
      final res = await ApiService.post('/notifications/send-report/${_selected!['id']}', {'channel': 'whatsapp'});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('WhatsApp message queued for +91 ${_selected!['parent_phone']}'),
          backgroundColor: const Color(0xFF25D366),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: Colors.redAccent));
      }
    }
  }
}

// ==================== 7. SETTINGS & ATLAS ====================
class SettingsView extends StatefulWidget {
  const SettingsView({super.key});

  @override
  State<SettingsView> createState() => _SettingsViewState();
}

class _SettingsViewState extends State<SettingsView> {
  bool _loading = true;
  Map<String, dynamic>? _meta;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final m = await ApiService.get('/meta');
      setState(() {
        _meta = m;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.cloud_done_rounded, color: Color(0xFF10B981)),
                    SizedBox(width: 8),
                    Text('Database Engine', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ],
                ),
                const SizedBox(height: 10),
                Text('Active Engine: ${_meta?['database'] ?? 'MongoDB Atlas'}', style: const TextStyle(color: Color(0xFF34D399), fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                const Text('Cluster: cluster0.ey3rp.mongodb.net (Cloud Hosted)', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                const SizedBox(height: 4),
                const Text('Database: edupulse', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.tune_rounded, color: Color(0xFF818CF8)),
                    SizedBox(width: 8),
                    Text('Institutional Thresholds', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ],
                ),
                const SizedBox(height: 12),
                _settingRow('Low Attendance Alert', '75%'),
                _settingRow('Pass Mark Threshold', '40%'),
                _settingRow('Low Marks Warning', '50%'),
                _settingRow('Performance Drop Alert', '15%'),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _settingRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8))),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
        ],
      ),
    );
  }
}
