import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qimpgchqxrducbmbvfaz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbXBnY2hxeHJkdWNibWJ2ZmF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3ODA3ODksImV4cCI6MjA2NDM1Njc4OX0.Ou6jsTxE2XSGL56TFRVt6ZENfCS4crzY2Y2Ny7vfKQM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function sendMessage({ nickname, text }) {
  const { data, error } = await supabase
    .from('messages')
    .insert([{ nickname, text }]);
  
  if (error) {
    throw new Error(`Fehler beim Senden: ${error.message}`);
  }
  
  return data;
}

export async function getMessages() {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true }); // Beispiel mit Sortierung

  if (error) {
    throw new Error(`Fehler beim Laden: ${error.message}`);
  }

  return data;
}