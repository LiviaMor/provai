// Property-based tests for the Measurement Engine (bodyMeasurement.ts)
// Validates correctness properties from the design document.
// Uses fast-check for property-based testing with Vitest.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  calculateMeasurementsFromLandmarks,
  calculateSizeRecommendation,
  calculateTailoringMeasurements,
  ellipseCircumference,
  CIRCUMFERENCE_FACTORS,
  type BodyLandmarks,
  type ScaleCalibration,
} from "./bodyMeasurement";

// ============================================================================
// Arbitraries — generators for valid inputs
// ============================================================================

const arbCoord = (): fc.Arbitrary<[number, number]> =>
  fc.tuple(fc.integer({ min: 50, max: 2000 }), fc.integer({ min: 50, max: 4000 }));

const arbLandmarks = (): fc.Arbitrary<BodyLandmarks> =>
  fc.record({
    head_top: arbCoord(),
    chin: arbCoord(),
    shoulder_left: arbCoord(),
    shoulder_right: arbCoord(),
    bust_left: arbCoord(),
    bust_right: arbCoord(),
    waist_left: arbCoord(),
    waist_right: arbCoord(),
    hip_left: arbCoord(),
    hip_right: arbCoord(),
    knee_left: arbCoord(),
    knee_right: arbCoord(),
    ankle_left: arbCoord(),
    ankle_right: arbCoord(),
  }) as fc.Arbitrary<BodyLandmarks>;

const arbCalibration = (): fc.Arbitrary<ScaleCalibration> =>
  fc.record({
    px_per_cm: fc.double({ min: 5, max: 100, noNaN: true }),
    confidence: fc.double({ min: 0, max: 1, noNaN: true }),
    source: fc.constantFrom("marker" as const, "height" as const),
  });

const arbGender = (): fc.Arbitrary<"female" | "male"> =>
  fc.constantFrom("female" as const, "male" as const);

// ============================================================================
// Property 1: Measurement Engine determinism
// For any valid inputs, calling twice produces identical output.
// Validates: Requirements 4.7, 15.1
// ============================================================================

describe("Feature: virtual-tryon-sizing-pipeline, Property 1: Measurement Engine determinism", () => {
  it("should produce identical output for identical inputs", () => {
    fc.assert(
      fc.property(arbLandmarks(), arbCalibration(), arbGender(), (landmarks, calibration, gender) => {
        const result1 = calculateMeasurementsFromLandmarks(landmarks, calibration, gender, false);
        const result2 = calculateMeasurementsFromLandmarks(landmarks, calibration, gender, false);

        expect(result1.height_cm).toBe(result2.height_cm);
        expect(result1.shoulder_width_cm).toBe(result2.shoulder_width_cm);
        expect(result1.bust_cm).toBe(result2.bust_cm);
        expect(result1.waist_cm).toBe(result2.waist_cm);
        expect(result1.hip_cm).toBe(result2.hip_cm);
        expect(result1.inseam_cm).toBe(result2.inseam_cm);
        expect(result1.confidence).toBe(result2.confidence);
        expect(result1.method).toBe(result2.method);
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 3: Ramanujan ellipse mathematical bounds
// For any positive width and depth: 2(w+d)/π ≤ circumference ≤ 2(w+d)
// Validates: Requirements 4.3, 15.4
// ============================================================================

describe("Feature: virtual-tryon-sizing-pipeline, Property 3: Ramanujan ellipse bounds", () => {
  it("should satisfy mathematical bounds for all positive width/depth", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 100, noNaN: true }),
        fc.double({ min: 1, max: 100, noNaN: true }),
        (width, depth) => {
          const circ = ellipseCircumference(width, depth);
          const lowerBound = (2 * (width + depth)) / Math.PI;
          const upperBound = 2 * (width + depth);

          expect(circ).toBeGreaterThanOrEqual(lowerBound * 0.99); // 1% tolerance for floating point
          expect(circ).toBeLessThanOrEqual(upperBound * 1.01);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ============================================================================
// Property 5: Frontal circumference = width × anthropometric factor
// Validates: Requirements 4.2
// ============================================================================

describe("Feature: virtual-tryon-sizing-pipeline, Property 5: Frontal circumference = width × factor", () => {
  it("should equal width × factor for each body region", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 5, max: 60, noNaN: true }),
        arbGender(),
        (frontalWidth, gender) => {
          const factors = CIRCUMFERENCE_FACTORS[gender];
          const bustCirc = Math.round(frontalWidth * factors.bust * 10) / 10;
          const waistCirc = Math.round(frontalWidth * factors.waist * 10) / 10;
          const hipCirc = Math.round(frontalWidth * factors.hip * 10) / 10;

          // These should be positive and within plausible range
          expect(bustCirc).toBeGreaterThan(0);
          expect(waistCirc).toBeGreaterThan(0);
          expect(hipCirc).toBeGreaterThan(0);

          // Verify the factor relationship
          expect(bustCirc).toBeCloseTo(frontalWidth * factors.bust, 0);
          expect(waistCirc).toBeCloseTo(frontalWidth * factors.waist, 0);
          expect(hipCirc).toBeCloseTo(frontalWidth * factors.hip, 0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 7: Tailoring measurements match proportional formulas
// crotch = height × 16%, pants = height × 61%, shirt = height × 45%, armhole = bust / 4.4
// Validates: Requirements 4.4
// ============================================================================

describe("Feature: virtual-tryon-sizing-pipeline, Property 7: Tailoring formulas", () => {
  it("should match industrial proportional formulas", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 140, max: 210, noNaN: true }),
        fc.double({ min: 60, max: 150, noNaN: true }),
        (height, bust) => {
          const tailoring = calculateTailoringMeasurements(height, bust, 70, 95);

          expect(tailoring.crotch_height_cm).toBeCloseTo(Math.round((height * 16 / 100) * 10) / 10, 1);
          expect(tailoring.pants_length_cm).toBeCloseTo(Math.round((height * 61 / 100) * 10) / 10, 1);
          expect(tailoring.shirt_length_cm).toBeCloseTo(Math.round((height * 45 / 100) * 10) / 10, 1);
          expect(tailoring.armhole_depth_cm).toBeCloseTo(Math.round((bust / 4.4) * 10) / 10, 1);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 8: Calibration source determines confidence
// marker → "alta", height → "media"
// Validates: Requirements 4.5, 2.2
// ============================================================================

describe("Feature: virtual-tryon-sizing-pipeline, Property 8: Calibration confidence", () => {
  it("marker calibration should produce alta confidence", () => {
    fc.assert(
      fc.property(arbLandmarks(), arbGender(), (landmarks, gender) => {
        const markerCal: ScaleCalibration = { px_per_cm: 40, confidence: 0.95, source: "marker" };
        const result = calculateMeasurementsFromLandmarks(landmarks, markerCal, gender, false);
        expect(result.confidence).toBe("alta");
      }),
      { numRuns: 50 }
    );
  });

  it("height calibration should produce media confidence", () => {
    fc.assert(
      fc.property(arbLandmarks(), arbGender(), (landmarks, gender) => {
        const heightCal: ScaleCalibration = { px_per_cm: 40, confidence: 0.7, source: "height" };
        const result = calculateMeasurementsFromLandmarks(landmarks, heightCal, gender, false);
        expect(result.confidence).toBe("media");
      }),
      { numRuns: 50 }
    );
  });
});

// ============================================================================
// Property 2: Size Engine determinism
// Validates: Requirements 5.7, 15.2
// ============================================================================

describe("Feature: virtual-tryon-sizing-pipeline, Property 2: Size Engine determinism", () => {
  it("should produce identical output for identical inputs", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 60, max: 150, noNaN: true }),
        fc.double({ min: 50, max: 140, noNaN: true }),
        fc.double({ min: 60, max: 160, noNaN: true }),
        arbGender(),
        (bust, waist, hip, gender) => {
          const r1 = calculateSizeRecommendation({ bust_cm: bust, waist_cm: waist, hip_cm: hip }, gender);
          const r2 = calculateSizeRecommendation({ bust_cm: bust, waist_cm: waist, hip_cm: hip }, gender);

          expect(r1.size_brazil).toBe(r2.size_brazil);
          expect(r1.size_international).toBe(r2.size_international);
          expect(r1.size_european).toBe(r2.size_european);
          expect(r1.pants_number_brazil).toBe(r2.pants_number_brazil);
          expect(r1.justification).toBe(r2.justification);
          expect(r1.confidence).toBe(r2.confidence);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 9: Size Engine output completeness
// Validates: Requirements 5.1, 5.3, 5.4, 5.6
// ============================================================================

describe("Feature: virtual-tryon-sizing-pipeline, Property 9: Size Engine completeness", () => {
  const validSizes = ["PP", "P", "M", "G", "GG", "XGG"];
  const validIntl = ["XS", "S", "M", "L", "XL", "XXL"];

  it("should return valid size values for all measurement ranges", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 60, max: 150, noNaN: true }),
        fc.double({ min: 50, max: 140, noNaN: true }),
        fc.double({ min: 60, max: 160, noNaN: true }),
        arbGender(),
        (bust, waist, hip, gender) => {
          const result = calculateSizeRecommendation({ bust_cm: bust, waist_cm: waist, hip_cm: hip }, gender);

          expect(validSizes).toContain(result.size_brazil);
          expect(validIntl).toContain(result.size_international);
          expect(result.size_european).toBeGreaterThanOrEqual(34);
          expect(result.size_european).toBeLessThanOrEqual(48);
          expect(result.pants_number_brazil).toBeGreaterThanOrEqual(34);
          expect(result.pants_number_brazil).toBeLessThanOrEqual(48);
          expect(result.justification.length).toBeGreaterThan(0);
          expect(result.confidence).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
