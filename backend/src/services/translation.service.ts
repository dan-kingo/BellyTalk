import { TranslationServiceClient } from "@google-cloud/translate";
import dotenv from "dotenv";
import { supabase } from "../configs/supabase.js";

dotenv.config();

const projectId = process.env.GOOGLE_PROJECT_ID!;
const location = "global";
const client = new TranslationServiceClient();

export async function translateText(text: string, targetLang: string, sourceLang = "en") {
  // Check cache first
  const { data: cached } = await supabase
    .from("translations_cache")
    .select("translated_text")
    .eq("source_text", text)
    .eq("source_lang", sourceLang)
    .eq("target_lang", targetLang)
    .single();

  if (cached?.translated_text) return cached.translated_text;

  // If not cached, translate via Google
  const [response] = await client.translateText({
    parent: `projects/${projectId}/locations/${location}`,
    contents: [text],
    mimeType: "text/plain",
    sourceLanguageCode: sourceLang,
    targetLanguageCode: targetLang,
  });

  const translated = response.translations?.[0]?.translatedText ?? text;

  // Save cache
  await supabase.from("translations_cache").insert([
    { source_text: text, source_lang: sourceLang, target_lang: targetLang, translated_text: translated },
  ]);

  return translated;
}
