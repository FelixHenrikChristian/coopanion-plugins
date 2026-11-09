"""Optional offline helper, never imported or executed by the World runtime."""

import argparse
import json
from pathlib import Path

import cv2
import numpy as np


def remove_white_background(rgb, rough_alpha, *, white_min=235, white_chroma_max=18,
                            protect_mask=None, background_mask=None):
    if rgb.dtype != np.uint8 or rgb.ndim != 3 or rgb.shape[2] != 3:
        raise ValueError('RGB must be an HxWx3 uint8 array')
    if rough_alpha.dtype != np.uint8 or rough_alpha.shape != rgb.shape[:2]:
        raise ValueError('Rough alpha must be a matching HxW uint8 array')
    if not 0 <= white_min <= 255 or not 0 <= white_chroma_max <= 255:
        raise ValueError('White thresholds must be between 0 and 255')
    shape = rgb.shape[:2]
    positive = np.zeros(shape, bool) if protect_mask is None else np.asarray(protect_mask) > 0
    negative = np.zeros(shape, bool) if background_mask is None else np.asarray(background_mask) > 0
    if positive.shape != shape or negative.shape != shape or np.any(positive & negative):
        raise ValueError('Correction masks must match the canvas and must not overlap')
    coarse = (rough_alpha > 127).astype(np.uint8)
    inside = cv2.distanceTransform(coarse, cv2.DIST_L2, 3)
    white = (rgb.min(axis=2) >= white_min) & (np.ptp(rgb.astype(np.int16), axis=2) <= white_chroma_max)
    if np.any(negative & ~white):
        raise ValueError('Background corrections must select near-white pixels, not drawn outlines')
    count, labels, statistics, _ = cv2.connectedComponentsWithStats((white & ~positive).astype(np.uint8), 4)
    exterior = np.zeros(shape, bool)
    enclosed_background = exterior.copy()
    protected = positive.copy()
    ambiguous = exterior.copy()
    regions = []
    for label in range(1, count):
        left, top, width, height, area = [int(value) for value in statistics[label]]
        region = labels == label
        overlap = float(coarse[region].mean())
        border = left == 0 or top == 0 or left + width == shape[1] or top + height == shape[0]
        if border:
            exterior |= region
            kind = 'border-connected-background'
        elif np.any(region & negative) or overlap < .2:
            enclosed_background |= region
            kind = 'enclosed-background'
        elif overlap > .8:
            protected |= region
            kind = 'protected-enclosed-foreground'
        else:
            ambiguous |= region
            kind = 'ambiguous-kept-for-review'
        if area >= 3:
            regions.append({'bbox': [left, top, width, height], 'area': area,
                            'coarse_overlap': round(overlap, 4), 'kind': kind})
    background = (exterior | enclosed_background) & ~positive
    candidates = (~background).astype(np.uint8)
    count, components, statistics, _ = cv2.connectedComponentsWithStats(candidates, 8)
    scores = np.bincount(components.ravel(), weights=coarse.ravel(), minlength=count)
    scores[0] = 0
    if not np.any(scores > 0):
        raise ValueError('No foreground component overlaps the rough mask')
    main = int(scores.argmax())
    foreground = components == main
    close = cv2.dilate(foreground.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    outside_prior = cv2.distanceTransform(1 - coarse, cv2.DIST_L2, 3)
    for label in range(1, count):
        if label == main:
            continue
        region = components == label
        if np.any(region & close) and np.any(region & (outside_prior <= 8)):
            foreground |= region
    foreground |= protected
    distance = cv2.distanceTransform(foreground.astype(np.uint8), cv2.DIST_L2, 3)
    darkest = cv2.erode(rgb.min(axis=2), np.ones((5, 5), np.uint8)).astype(float)
    fringe = (foreground & (distance < 1.5) & (rgb.min(axis=2) > 150)
              & (np.ptp(rgb.astype(np.int16), axis=2) < 30) & (darkest < 125) & ~protected)
    alpha = foreground.astype(float)
    alpha[fringe] = np.clip((255 - rgb.min(axis=2)[fringe].astype(float))
                            / np.maximum(255 - darkest[fringe], 1), 0, 1)
    output_rgb = rgb.copy()
    unmix = (rgb.astype(float) - 255 * (1 - alpha[:, :, None])) / np.maximum(alpha[:, :, None], .001)
    output_rgb[fringe] = np.clip(np.round(unmix[fringe]), 0, 255).astype(np.uint8)
    output_alpha = np.round(alpha * 255).astype(np.uint8)
    assert np.all(output_alpha[background] == 0)
    assert np.all(output_alpha[protected] == 255)
    assert np.array_equal(output_rgb[foreground & ~fringe], rgb[foreground & ~fringe])
    stats = {'exterior_white_pixels': int(exterior.sum()),
             'closed_background_pixels': int(enclosed_background.sum()),
             'protected_white_pixels': int(protected.sum()),
             'ambiguous_pixels': int(ambiguous.sum()),
             'exterior_inside_old_core_pixels': int((exterior & (inside >= 2)).sum()),
             'edge_unmixed_pixels': int(fringe.sum()), 'regions': regions}
    overlay = rgb.astype(float) * .65
    for mask, color in [(exterior, [235, 65, 65]), (enclosed_background, [235, 120, 35]),
                        (protected, [40, 225, 100]), (ambiguous, [235, 210, 40])]:
        overlay[mask] = rgb[mask] * .35 + np.array(color) * .65
    return np.dstack([output_rgb, output_alpha]), stats, np.clip(overlay, 0, 255).astype(np.uint8)


def main():
    from PIL import Image
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', required=True, type=Path)
    parser.add_argument('--prior', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--protect', type=Path)
    parser.add_argument('--background', type=Path)
    parser.add_argument('--report', type=Path)
    parser.add_argument('--white-min', type=int, default=235)
    parser.add_argument('--white-chroma-max', type=int, default=18)
    args = parser.parse_args()
    destinations = [args.output] + ([args.report] if args.report else [])
    sources = [args.image, args.prior] + [item for item in [args.protect, args.background] if item]
    if args.output.suffix.lower() != '.png':
        parser.error('Output must be a lossless RGBA PNG')
    if any(item.exists() or item.resolve() in [source.resolve() for source in sources] for item in destinations):
        parser.error('Output/report must be new paths; source and accepted assets are never overwritten')
    rgb = np.array(Image.open(args.image).convert('RGB'))
    prior = np.array(Image.open(args.prior).convert('L'))
    mask = lambda filename: np.array(Image.open(filename).convert('L')) if filename else None
    rgba, stats, _ = remove_white_background(rgb, prior, white_min=args.white_min,
        white_chroma_max=args.white_chroma_max, protect_mask=mask(args.protect), background_mask=mask(args.background))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba).save(args.output)
    stats['acceptance'] = 'pending full video playback; warnings are not automatic approval'
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(stats, indent=2), encoding='utf8')
    print(json.dumps(stats))


if __name__ == '__main__':
    main()
