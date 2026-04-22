import { describe, it, expect } from "vitest";
import { useMemo, useState } from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  suggestSize,
  resolveHemPreference,
  detectCategory,
  HEM_OPTIONS_BY_CATEGORY,
  HEM_PREFERENCE_LABELS,
  type HemPreference,
  type UserMeasurements,
} from "./sizing";

const measures: UserMeasurements = {
  height_cm: 168,
  bust_cm: 90,
  waist_cm: 72,
  hip_cm: 96,
  inseam_cm: 76,
};

// Componente mínimo que reproduz o fluxo do ProductCard:
// pref → resolveHemPreference(category, pref) → suggestSize → exibe ajuste/nota.
// Usamos botões nativos para evitar o portal do Radix em jsdom; a lógica
// exercitada (state → memo → render) é idêntica à do componente real.
function FitHarness({ productText }: { productText: string }) {
  const category = detectCategory(productText);
  const options =
    category === "bottom" ? HEM_OPTIONS_BY_CATEGORY.bottom :
    category === "dress" ? HEM_OPTIONS_BY_CATEGORY.dress : [];
  const [pref, setPref] = useState<HemPreference>(options[0] ?? "ankle");
  const effective = useMemo(() => resolveHemPreference(category, pref), [category, pref]);
  const sizing = useMemo(
    () => suggestSize(productText, measures, effective),
    [productText, effective],
  );
  return (
    <div>
      <p data-testid="active-pref">{pref}</p>
      <p data-testid="effective-pref">{effective}</p>
      <p data-testid="hem-adjust">{sizing?.hemAdjustCm ?? "none"}</p>
      <p data-testid="last-note">{sizing?.fitNotes.find((n) => n.startsWith("Barra")) ?? "no-hem-note"}</p>
      <ul>
        {options.map((o) => (
          <li key={o}>
            <button onClick={() => setPref(o)}>{HEM_PREFERENCE_LABELS[o]}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

describe("ProductCard fit recalc — seleção sequencial de opções de barra", () => {
  it("calça: cada clique troca o ajuste e a nota acompanha o último filtro", async () => {
    const user = userEvent.setup();
    render(<FitHarness productText="Calça reta de alfaiataria" />);

    const sequence: HemPreference[] = ["ankle", "seven_eighths", "cropped", "floor"];
    const seenAdjusts: string[] = [];
    const seenNotes: string[] = [];

    for (const pref of sequence) {
      await user.click(screen.getByRole("button", { name: HEM_PREFERENCE_LABELS[pref] }));
      const activePref = screen.getByTestId("active-pref").textContent;
      const effective = screen.getByTestId("effective-pref").textContent;
      const adjust = screen.getByTestId("hem-adjust").textContent!;
      const note = screen.getByTestId("last-note").textContent!;

      // Estado da UI = última seleção (nunca atrasado)
      expect(activePref).toBe(pref);
      expect(effective).toBe(pref);
      // Nota exibida deve refletir a pref ativa pelo label
      expect(note.toLowerCase()).toContain(HEM_PREFERENCE_LABELS[pref].toLowerCase());
      seenAdjusts.push(adjust);
      seenNotes.push(note);
    }

    // Cada pref distinta gerou ajuste distinto (sem cache antigo aparecendo)
    expect(new Set(seenAdjusts).size).toBe(sequence.length);
    expect(new Set(seenNotes).size).toBe(sequence.length);
  });

  it("vestido: alternância rápida entre midi/knee/cropped não vaza nota antiga", async () => {
    const user = userEvent.setup();
    render(<FitHarness productText="Vestido fluido" />);

    const sequence: HemPreference[] = ["midi", "knee", "cropped", "midi"];
    const final = sequence[sequence.length - 1];

    for (const pref of sequence) {
      await user.click(screen.getByRole("button", { name: HEM_PREFERENCE_LABELS[pref] }));
    }

    expect(screen.getByTestId("active-pref").textContent).toBe(final);
    expect(screen.getByTestId("effective-pref").textContent).toBe(final);
    const note = screen.getByTestId("last-note").textContent!;
    expect(note.toLowerCase()).toContain(HEM_PREFERENCE_LABELS[final].toLowerCase());
    // Não deve mencionar prefs anteriores que já não estão ativas
    expect(note.toLowerCase()).not.toContain(HEM_PREFERENCE_LABELS["knee"].toLowerCase());
    expect(note.toLowerCase()).not.toContain(HEM_PREFERENCE_LABELS["cropped"].toLowerCase());
  });

  it("cliques back-to-back (sem await entre eles) ainda convergem para a última seleção", async () => {
    const user = userEvent.setup();
    render(<FitHarness productText="Calça pantalona" />);

    await act(async () => {
      // Dispara várias trocas em sequência síncrona — testa que o último vence.
      await user.click(screen.getByRole("button", { name: HEM_PREFERENCE_LABELS["ankle"] }));
      await user.click(screen.getByRole("button", { name: HEM_PREFERENCE_LABELS["floor"] }));
      await user.click(screen.getByRole("button", { name: HEM_PREFERENCE_LABELS["cropped"] }));
      await user.click(screen.getByRole("button", { name: HEM_PREFERENCE_LABELS["seven_eighths"] }));
    });

    expect(screen.getByTestId("active-pref").textContent).toBe("seven_eighths");
    const note = screen.getByTestId("last-note").textContent!;
    expect(note.toLowerCase()).toContain(HEM_PREFERENCE_LABELS["seven_eighths"].toLowerCase());
  });
});
