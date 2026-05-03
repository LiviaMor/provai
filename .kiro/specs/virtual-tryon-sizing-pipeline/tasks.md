# Implementation Plan: Virtual Try-On & Sizing Pipeline

## Overview

This plan refactors and tests the existing virtual try-on and sizing pipeline. The codebase already has the core logic in place — the focus is on proving correctness through property-based tests, cleaning up the 1900+ line Index.tsx, ensuring the end-to-end flow works, and polishing error handling and UI.

Tasks are ordered to maximize confidence early: deterministic math gets property tests first, then refactoring makes the code testable and maintainable, then integration and UI polish.

## Tasks

- [ ] 1. Install fast-check and set up property test infrastructure
  - Install `fast-check` as a dev dependency
  - Create `ultraprovador/src/lib/bodyMeasurement.property.test.ts` with fast-check imports and test scaffolding
  - Create `ultraprovador/src/lib/sizing.property.test.ts` with fast-check imports and test scaffolding
  - Verify Vitest runs both property test files with `npm run test`
  - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [ ] 2. Property-based tests for the Measurement Engine (bodyMeasurement.ts)
  - [ ] 2.1 Write property test for Measurement Engine determinism
    - **Property 1: Measurement Engine determinism**
    - Generate arbitrary valid BodyLandmarks and ScaleCalibration using fast-check arbitraries
    - Call `calculateMeasurementsFromLandmarks` twice with identical inputs and assert all fields are strictly equal
    - Minimum 100 iterations
    - **Validates: Requirements 4.7, 15.1**

  - [ ]* 2.2 Write property test for Ramanujan ellipse mathematical bounds
    - **Property 3: Ramanujan ellipse mathematical bounds**
    - Generate arbitrary positive width and depth values (1–100cm range)
    - Assert: `2(width + depth) / π ≤ circumference ≤ 2(width + depth)`
    - Test the `ellipseCircumference` function (may need to export it or test via `calculateTailoringMeasurements`)
    - **Validates: Requirements 4.3, 15.4**

  - [ ]* 2.3 Write property test for linear measurements as pixel distance divided by scale
    - **Property 4: Linear measurements are pixel distance divided by scale**
    - Generate valid landmarks and calibration, verify each linear measurement equals `pixel_distance / px_per_cm` rounded to 1 decimal
    - **Validates: Requirements 4.1**

  - [ ]* 2.4 Write property test for frontal circumference equals width times factor
    - **Property 5: Frontal circumference equals width times anthropometric factor**
    - Generate valid frontal widths (5–60cm) and gender, verify circumference = `width × CIRCUMFERENCE_FACTORS[gender][region]` rounded to 1 decimal when no lateral photo
    - **Validates: Requirements 4.2**

  - [ ]* 2.5 Write property test for circumference within anthropometric range
    - **Property 6: Circumference within anthropometric range**
    - Generate frontal widths in plausible range (5–60cm), verify resulting circumferences fall within plausible human ranges (bust 60–150cm, waist 50–140cm, hip 60–160cm)
    - **Validates: Requirements 15.3**

  - [ ]* 2.6 Write property test for tailoring measurements match proportional formulas
    - **Property 7: Tailoring measurements match proportional formulas**
    - Generate valid height_cm (140–210) and bust_cm (60–150), verify: crotch_height = round(height × 0.16, 1), pants_length = round(height × 0.61, 1), shirt_length = round(height × 0.45, 1), armhole_depth = round(bust / 4.4, 1)
    - **Validates: Requirements 4.4**

  - [ ]* 2.7 Write property test for calibration source determines confidence
    - **Property 8: Calibration source determines confidence**
    - Generate valid inputs with source "marker" → assert confidence "alta"; source "height" → assert confidence "media"
    - **Validates: Requirements 4.5, 2.2**

- [ ] 3. Checkpoint — Ensure all measurement engine property tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Property-based tests for the Size Engine (sizing.ts + bodyMeasurement.ts)
  - [ ] 4.1 Write property test for Size Engine determinism
    - **Property 2: Size Engine determinism**
    - Generate arbitrary valid bust_cm, waist_cm, hip_cm, and gender
    - Call `calculateSizeRecommendation` twice with identical inputs and assert all fields are strictly equal
    - Minimum 100 iterations
    - **Validates: Requirements 5.7, 15.2**

  - [ ]* 4.2 Write property test for Size Engine output completeness
    - **Property 9: Size Engine output completeness for both genders**
    - Generate bust_cm (60–150), waist_cm (50–140), hip_cm (60–160), gender
    - Assert: size_brazil ∈ ["PP","P","M","G","GG","XGG"], size_international ∈ ["XS","S","M","L","XL","XXL"], size_european ∈ [34,48], pants_number_brazil ∈ [34,48], justification is non-empty and contains at least one measurement value, confidence is defined
    - **Validates: Requirements 5.1, 5.3, 5.4, 5.6**

  - [ ]* 4.3 Write property test for largest measurement wins
    - **Property 10: Largest measurement wins for size selection**
    - Generate measurements where bust, waist, and hip map to different size ranges
    - Assert the returned size_brazil is the largest of the individual sizes
    - **Validates: Requirements 5.2**

  - [ ]* 4.4 Write property test for category detection correctness
    - **Property 11: Category detection correctness**
    - Generate product text strings containing known category keywords
    - Assert `detectCategory` returns the correct category; strings with no keywords return "unknown"
    - **Validates: Requirements 13.1, 13.5**

  - [ ]* 4.5 Write property test for bottom sizing prioritizes hip
    - **Property 12: Bottom sizing prioritizes hip**
    - Generate measurements where hip maps to a larger size than waist
    - Assert `suggestSize` for a bottom-category garment returns the hip-based size
    - **Validates: Requirements 13.3**

  - [ ]* 4.6 Write property test for dress hip-bust difference flag
    - **Property 13: Dress hip-bust difference flag**
    - Generate measurements where `hip_cm - bust_cm > 8`
    - Assert `suggestSize` for a dress includes a fit note mentioning the hip-bust difference
    - **Validates: Requirements 13.4**

  - [ ]* 4.7 Write property test for hem preference fallback
    - **Property 14: Hem preference fallback for incompatible categories**
    - Generate all category/preference combinations
    - Assert `resolveHemPreference` returns unchanged preference when valid, or "ankle" for bottoms / "midi" for dresses when not applicable
    - **Validates: Requirements 14.4**

  - [ ]* 4.8 Write property test for hem adjustment exceeding 2cm triggers fit note
    - **Property 15: Hem adjustment exceeding 2cm triggers fit note**
    - Generate bottom-category garments with inseam measurements that produce |hemAdjust| > 2cm
    - Assert `suggestSize` includes a fit note containing "Barra" and the adjustment amount
    - **Validates: Requirements 14.3**

- [ ] 5. Checkpoint — Ensure all sizing property tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Property-based tests for URL validation and image compression
  - [ ]* 6.1 Write property test for URL validation blocks unsafe hosts
    - **Property 16: URL validation blocks unsafe hosts**
    - Create `ultraprovador/src/lib/urlValidation.test.ts`
    - Extract or reference the `isBlockedHost` and `safeUrl` logic from `supabase/functions/virtual-tryon/index.ts`
    - Generate URLs with localhost, private IPs (127.x, 10.x, 192.168.x, 172.16-31.x), .local/.internal domains, non-http protocols
    - Assert all are rejected; valid public https URLs are accepted
    - **Validates: Requirements 6.5**

  - [ ]* 6.2 Write property test for image compression respects maximum width
    - **Property 17: Image compression respects maximum width**
    - Create `ultraprovador/src/lib/imageCompression.test.ts`
    - Test the `compressImageForApi` function from `gemini.ts` (may need to export it or extract it)
    - Generate input widths > 1024 → assert output width ≤ 1024; input widths ≤ 1024 → assert output width ≤ input width
    - Note: This test requires a DOM environment (jsdom) for Canvas/Image APIs
    - **Validates: Requirements 1.6**

- [ ] 7. Refactor Index.tsx — Extract measurement pipeline into composable hooks and components
  - [ ] 7.1 Extract measurement pipeline logic into a custom hook `useMeasurementPipeline`
    - Create `ultraprovador/src/hooks/useMeasurementPipeline.ts`
    - Move the Gemini landmark detection call, measurement calculation, and size recommendation logic out of Index.tsx into this hook
    - Hook should accept photo data URL, calibration info, and gender; return measurements, size recommendation, loading state, and error
    - Wire the hook back into Index.tsx so existing behavior is preserved
    - _Requirements: 3.1, 4.1, 4.2, 5.1_

  - [ ] 7.2 Extract virtual try-on logic into a custom hook `useVirtualTryon`
    - Create `ultraprovador/src/hooks/useVirtualTryon.ts`
    - Move the Supabase Edge Function call, garment image handling, and try-on result state out of Index.tsx
    - Hook should accept user photo, garment image/URL, measurements, and gender; return try-on image, styling advice, loading state, and error
    - Wire the hook back into Index.tsx
    - _Requirements: 7.1, 7.2, 7.3, 8.1, 8.3_

  - [ ] 7.3 Extract result display into a dedicated component `TryonResultDisplay`
    - Create `ultraprovador/src/components/TryonResultDisplay.tsx`
    - Move the result rendering logic (try-on image, size recommendation, measurements, styling advice, tailoring adjustments) from Index.tsx into this component
    - Component receives measurements, size recommendation, try-on result, and styling advice as props
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [ ]* 7.4 Write unit tests for `useMeasurementPipeline` hook
    - Test with mocked Gemini responses returning known landmarks
    - Verify measurements and size recommendation match expected values
    - Test error states (Gemini failure, empty response, safety block)
    - _Requirements: 3.4, 3.5, 4.7, 5.7_

- [ ] 8. Checkpoint — Ensure refactored Index.tsx works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement error handling and graceful degradation
  - [ ] 9.1 Implement structured error handling in the measurement pipeline hook
    - Map Gemini API errors (400, 403, 429, safety block, empty response) to user-friendly Portuguese messages as defined in the design error table
    - When pose_quality is "ruim", display the issues list and recommend retaking the photo
    - When calibration is missing, block pipeline and prompt user for height or marker
    - _Requirements: 2.4, 2.5, 3.4, 3.5_

  - [ ] 9.2 Implement graceful degradation in the try-on flow
    - When FASHN AI fails, still display sizing result without try-on image
    - When styling advice fails, silently omit the styling section and show try-on + size
    - Display appropriate error messages for FASHN 401/402/429/timeout errors
    - Implement the degradation hierarchy: Full → Partial (no styling) → Minimal (no try-on) → Manual fallback
    - _Requirements: 7.5, 7.6, 7.7, 7.8, 8.3, 10.7_

  - [ ]* 9.3 Write unit tests for error handling paths
    - Test each Gemini error code maps to the correct user message
    - Test each FASHN error code maps to the correct user message
    - Test degradation: FASHN failure still shows sizing; styling failure still shows try-on + sizing
    - _Requirements: 3.4, 3.5, 7.5, 7.6, 7.7, 7.8, 8.3_

- [ ] 10. Implement manual measurement input mode
  - [ ] 10.1 Ensure manual input form feeds directly into the Size Engine
    - Verify the manual input form in Index.tsx (or refactored component) accepts height, weight, bust, waist, hip, inseam
    - Wire manual measurements through `calculateSizeRecommendation` and `suggestSize` without going through Gemini/landmarks
    - Ensure manual mode skips landmark detection and measurement engine, going directly to size recommendation
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 10.2 Allow virtual try-on with manual measurements
    - When manual measurements are provided along with a user photo and garment, still allow the try-on edge function call
    - Pass manual measurements to the styling advisor for context
    - _Requirements: 9.4_

- [ ] 11. Polish result display UI
  - [ ] 11.1 Implement the `TryonResultDisplay` component with complete layout
    - Show try-on image prominently with loading skeleton
    - Show size recommendation card: Brazilian size (P/M/G/GG), international (XS/S/M/L/XL), European (34–48), pants number (34–48)
    - Show measurement justification string explaining why each size was chosen
    - Show calculated body measurements with confidence level badge and calculation method
    - Show tailoring adjustments (hem, armhole, cuff notes) when relevant
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.6_

  - [ ] 11.2 Implement styling advice display section
    - Show fit notes, outfit combinations with occasion tags, and color harmony analysis
    - Gracefully hide the section when styling advice is unavailable
    - _Requirements: 10.5, 10.7_

- [ ] 12. Checkpoint — Ensure all tests pass and UI renders correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Wire end-to-end flow: photo → landmarks → measurements → size → try-on
  - [ ] 13.1 Connect CameraSilhouette capture to the measurement pipeline
    - Ensure captured photo from CameraSilhouette is compressed (max 1024px, JPEG 0.75) before sending to Gemini
    - Parse Gemini landmark response JSON and feed into `calculateMeasurementsFromLandmarks`
    - Use height-based calibration (user-provided height) as the default scale calibration
    - _Requirements: 1.6, 2.2, 3.1, 3.2, 4.1_

  - [ ] 13.2 Connect measurement results to the try-on edge function
    - After measurements are calculated, pass user photo + garment image + measurements to the virtual-tryon edge function
    - Handle the parallel flow: landmark detection and try-on can run concurrently
    - Merge results into the TryonResultDisplay component
    - _Requirements: 7.1, 7.2, 7.3, 8.1_

  - [ ] 13.3 Implement garment input (upload or URL)
    - Support direct garment image upload via file input
    - Support product URL input that resolves to a garment image via the edge function
    - Validate URLs client-side before sending (block localhost, private IPs)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 13.4 Write integration tests for the end-to-end flow
    - Mock Gemini API to return known landmarks
    - Mock Supabase edge function to return a try-on result
    - Verify the full flow produces expected measurements, size, and displays correctly
    - _Requirements: 3.1, 4.1, 5.1, 7.3, 10.1_

- [ ] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (17 properties)
- The project uses **Vitest** as the test runner and **fast-check** for property-based testing
- `fast-check` needs to be installed as a dev dependency (not currently in package.json)
- The existing `sizing.test.ts` has good unit tests that complement the new property tests
- Index.tsx (1900+ lines) is the primary refactoring target — extracting hooks and components
- The deterministic math pipeline (bodyMeasurement.ts, sizing.ts) is the highest-value test target
