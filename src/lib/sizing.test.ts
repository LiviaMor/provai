import { describe, it, expect } from "vitest";
import {
  detectCategory,
  resolveHemPreference,
  suggestSize,
  HEM_OPTIONS_BY_CATEGORY,
  HEM_PREFERENCE_LABELS,
  type HemPreference,
  type GarmentCategory,
  type UserMeasurements,
} from "./sizing";

// Replica do helper usado no Dashboard para decidir quais opções do seletor
// global devem ficar habilitadas dado o conjunto de categorias visíveis.
function hemOptionApplies(opt: HemPreference, visible: Set<GarmentCategory>): boolean {
  const inBottom = HEM_OPTIONS_BY_CATEGORY.bottom.includes(opt);
  const inDress = HEM_OPTIONS_BY_CATEGORY.dress.includes(opt);
  return (inBottom && visible.has("bottom")) || (inDress && visible.has("dress"));
}

const measures: UserMeasurements = {
  height_cm: 168,
  bust_cm: 90,
  waist_cm: 72,
  hip_cm: 96,
  inseam_cm: 76,
};

describe("detectCategory", () => {
  it("classifica calça como bottom", () => {
    expect(detectCategory("Calça pantalona alfaiataria")).toBe("bottom");
  });
  it("classifica vestido como dress", () => {
    expect(detectCategory("Vestido midi de linho")).toBe("dress");
  });
  it("retorna unknown quando nada bate", () => {
    expect(detectCategory("acessório dourado")).toBe("unknown");
  });
});

describe("resolveHemPreference (fallbacks)", () => {
  it("força ankle quando pref de vestido vem para calça", () => {
    expect(resolveHemPreference("bottom", "midi")).toBe("ankle");
    expect(resolveHemPreference("bottom", "knee")).toBe("ankle");
  });
  it("força midi quando pref de calça vem para vestido", () => {
    expect(resolveHemPreference("dress", "ankle")).toBe("midi");
    expect(resolveHemPreference("dress", "seven_eighths")).toBe("midi");
  });
  it("preserva preferências válidas para a categoria", () => {
    expect(resolveHemPreference("bottom", "cropped")).toBe("cropped");
    expect(resolveHemPreference("dress", "floor")).toBe("floor");
  });
  it("não interfere em categorias top/outerwear/unknown", () => {
    (["top", "outerwear", "unknown"] as GarmentCategory[]).forEach((c) => {
      expect(resolveHemPreference(c, "seven_eighths")).toBe("seven_eighths");
    });
  });
});

describe("hemOptionApplies (estado disabled do seletor global)", () => {
  it("lista vazia desabilita TODAS as opções", () => {
    const empty = new Set<GarmentCategory>();
    Object.keys(HEM_PREFERENCE_LABELS).forEach((k) => {
      expect(hemOptionApplies(k as HemPreference, empty)).toBe(false);
    });
  });

  it("apenas calças visíveis: habilita opções de bottom, desabilita exclusivas de vestido", () => {
    const v = new Set<GarmentCategory>(["bottom"]);
    expect(hemOptionApplies("ankle", v)).toBe(true);
    expect(hemOptionApplies("seven_eighths", v)).toBe(true);
    expect(hemOptionApplies("midi", v)).toBe(false);
    expect(hemOptionApplies("knee", v)).toBe(false);
  });

  it("apenas vestidos visíveis: habilita opções de dress, desabilita exclusivas de calça", () => {
    const v = new Set<GarmentCategory>(["dress"]);
    expect(hemOptionApplies("midi", v)).toBe(true);
    expect(hemOptionApplies("knee", v)).toBe(true);
    expect(hemOptionApplies("ankle", v)).toBe(false);
    expect(hemOptionApplies("seven_eighths", v)).toBe(false);
  });

  it("opções compartilhadas (floor/cropped) ficam habilitadas se qualquer categoria estiver visível", () => {
    expect(hemOptionApplies("floor", new Set(["bottom"]))).toBe(true);
    expect(hemOptionApplies("floor", new Set(["dress"]))).toBe(true);
    expect(hemOptionApplies("cropped", new Set(["bottom"]))).toBe(true);
    expect(hemOptionApplies("cropped", new Set(["dress"]))).toBe(true);
  });

  it("apenas categorias não relevantes (top/unknown) desabilitam todas as opções de barra", () => {
    const v = new Set<GarmentCategory>(["top", "unknown", "outerwear"]);
    Object.keys(HEM_PREFERENCE_LABELS).forEach((k) => {
      expect(hemOptionApplies(k as HemPreference, v)).toBe(false);
    });
  });
});

describe("suggestSize com alternância rápida de hemPref", () => {
  it("alternar prefs rapidamente em uma calça nunca quebra e mantém categoria bottom", () => {
    const sequence: HemPreference[] = ["midi", "ankle", "knee", "cropped", "floor", "seven_eighths"];
    for (const pref of sequence) {
      const r = suggestSize("Calça reta de alfaiataria", measures, pref);
      expect(r).not.toBeNull();
      expect(r!.category).toBe("bottom");
    }
  });

  it("alternar prefs rapidamente em um vestido nunca quebra e mantém categoria dress", () => {
    const sequence: HemPreference[] = ["ankle", "midi", "seven_eighths", "knee", "cropped"];
    for (const pref of sequence) {
      const r = suggestSize("Vestido fluido de verão", measures, pref);
      expect(r).not.toBeNull();
      expect(r!.category).toBe("dress");
    }
  });

  it("retorna null para item de categoria desconhecida (estado de fallback)", () => {
    expect(suggestSize("acessório dourado", measures, "ankle")).toBeNull();
  });

  it("ajustes de barra mudam quando a pref muda na mesma calça", () => {
    const a = suggestSize("Calça reta", measures, "ankle");
    const b = suggestSize("Calça reta", measures, "cropped");
    expect(a?.hemAdjustCm).toBeDefined();
    expect(b?.hemAdjustCm).toBeDefined();
    expect(a!.hemAdjustCm).not.toBe(b!.hemAdjustCm);
  });
});
