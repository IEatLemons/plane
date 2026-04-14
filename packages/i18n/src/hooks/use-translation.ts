/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useContext } from "react";
// context
import { TranslationContext } from "../context";
// types
import type { ILanguageOption, TLanguage } from "../types";

export type TTranslationStore = {
  t: (key: string, params?: Record<string, unknown>) => string;
  currentLocale: TLanguage;
  changeLanguage: (lng: TLanguage) => void;
  languages: ILanguageOption[];
};

/**
 * Provides the translation store to the application
 * @returns {TTranslationStore}
 * @returns {(key: string, params?: Record<string, any>) => string} t: method to translate the key with params
 * @returns {TLanguage} currentLocale - current locale language
 * @returns {(lng: TLanguage) => void} changeLanguage - method to change the language
 * @returns {ILanguageOption[]} languages - available languages
 * @throws {Error} if the TranslationProvider is not used
 */
export function useTranslation(): TTranslationStore {
  const store = useContext(TranslationContext);
  if (!store) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }

  // Stable references: `bind`/`() => store.t()` per render breaks useCallback/useEffect deps site-wide.
  const t = useCallback((key: string, params?: Record<string, unknown>) => store.t(key, params), [store]);
  const changeLanguage = useCallback(
    (lng: TLanguage) => {
      void store.setLanguage(lng);
    },
    [store]
  );

  return {
    t,
    currentLocale: store.currentLocale,
    changeLanguage,
    languages: store.availableLanguages,
  };
}
