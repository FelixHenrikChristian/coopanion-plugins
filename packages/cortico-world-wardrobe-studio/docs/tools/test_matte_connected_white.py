import unittest

import numpy as np

from matte_connected_white import remove_white_background


class ConnectedWhiteTests(unittest.TestCase):
    def scene(self):
        rgb = np.full((64, 64, 3), 255, np.uint8)
        rgb[10:55, 10:55] = [25, 25, 25]
        rgb[12:53, 12:53] = [180, 120, 50]
        rgb[18:28, 18:28] = 250
        rgb[32:45, 36:46] = 255
        prior = np.zeros((64, 64), np.uint8)
        prior[10:55, 10:55] = 255
        prior[32:45, 36:46] = 0
        return rgb, prior

    def test_background_hole_and_light_foreground_are_distinct(self):
        rgb, prior = self.scene()
        result, stats, _ = remove_white_background(rgb, prior)
        self.assertEqual(result[0, 0, 3], 0)
        self.assertEqual(result[36, 40, 3], 0)
        self.assertEqual(result[22, 22, 3], 255)
        self.assertGreater(stats['closed_background_pixels'], 0)
        np.testing.assert_array_equal(result[10:12, 15:50, :3], rgb[10:12, 15:50])
        self.assertTrue(np.all(result[10:12, 15:50, 3] == 255))

    def test_explicit_enclosed_background_correction(self):
        rgb, prior = self.scene()
        correction = np.zeros(prior.shape, np.uint8)
        correction[22, 22] = 255
        result, _, _ = remove_white_background(rgb, prior, background_mask=correction)
        self.assertEqual(result[22, 22, 3], 0)
        self.assertEqual(result[10, 22, 3], 255)

    def test_positive_mask_blocks_a_light_region_leak(self):
        rgb, prior = self.scene()
        rgb[0:28, 18:28] = 255
        protection = np.zeros(prior.shape, np.uint8)
        protection[18:28, 18:28] = 255
        result, _, _ = remove_white_background(rgb, prior, protect_mask=protection)
        self.assertEqual(result[22, 22, 3], 255)
        self.assertEqual(result[0, 22, 3], 0)

    def test_invalid_corrections_are_refused(self):
        rgb, prior = self.scene()
        selection = np.zeros(prior.shape, np.uint8)
        selection[10, 15] = 255
        with self.assertRaises(ValueError):
            remove_white_background(rgb, prior, background_mask=selection)
        with self.assertRaises(ValueError):
            remove_white_background(rgb, prior, protect_mask=selection, background_mask=selection)

    def test_original_opaque_rgb_is_preserved(self):
        rgb, prior = self.scene()
        result, _, _ = remove_white_background(rgb, prior)
        opaque = result[:, :, 3] == 255
        np.testing.assert_array_equal(result[:, :, :3][opaque], rgb[opaque])

    def test_empty_or_mismatched_prior_is_refused(self):
        rgb, prior = self.scene()
        with self.assertRaises(ValueError):
            remove_white_background(rgb, prior[:20])
        with self.assertRaises(ValueError):
            remove_white_background(rgb, np.zeros_like(prior))


if __name__ == '__main__':
    unittest.main()
