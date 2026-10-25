import 'package:flutter_test/flutter_test.dart';
import 'package:edupulse_mobile/main.dart';

void main() {
  testWidgets('EduPulseApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const EduPulseApp());
    expect(find.text('EduPulse'), findsOneWidget);
    // Drain pending timers from SplashScreen
    await tester.pump(const Duration(seconds: 4));
    await tester.pumpAndSettle();
  });
}
