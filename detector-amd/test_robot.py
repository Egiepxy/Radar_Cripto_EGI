"""Testes locais sem rede para regras básicas do Detector AMD."""
import importlib.util
import pathlib
import unittest

SCRIPT = pathlib.Path(__file__).with_name("robot.py")
spec = importlib.util.spec_from_file_location("detector_amd_robot", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class RobotRulesTest(unittest.TestCase):
    def test_20_symbols_and_btc_first(self):
        self.assertEqual(len(mod.SYMBOLS), 20)
        self.assertEqual(mod.SYMBOLS[0], "BTCUSDT")
        self.assertEqual(len(set(mod.SYMBOLS)), 20)

    def test_relative_strength(self):
        btc = [{"time": 1, "close": 100}, {"time": 2, "close": 101}]
        sol = [{"time": 1, "close": 100}, {"time": 2, "close": 103}]
        self.assertAlmostEqual(mod.strength(sol, btc)["relative_pp"], 2)
        self.assertIsNone(mod.strength([{"time": 1, "close": 100}, {"time": 3, "close": 103}], btc))

    def test_alert_up_requires_volume_and_2h_4h_force(self):
        row = {"strength": {"2h": {"relative_pp": 1.2}, "4h": {"relative_pp": 0.5}}}
        event = {"type": "BREAK_UP", "volume_relative": 1.4}
        self.assertTrue(mod.should_notify_amd("SOLUSDT", row, "2h", event, {"SOLUSDT"}, set()))
        self.assertFalse(mod.should_notify_amd("SOLUSDT", row, "2h",
                                               dict(event, volume_relative=1.0), {"SOLUSDT"}, set()))
        self.assertFalse(mod.should_notify_amd("SOLUSDT", row, "2h",
                                               event, set(), set()))

    def test_rsi_range(self):
        prices = list(range(100, 150))
        self.assertAlmostEqual(mod.rsi(prices), 100)


if __name__ == "__main__":
    unittest.main()
