import { SchedulableProperty } from './types';
import { createServerComponentClient } from './supabase-server';

export async function getSchedulableProperties(): Promise<SchedulableProperty[]> {
  const supabase = await createServerComponentClient();
  const { data, error } = await supabase
    .from('all_schedulable_properties')
    .select('*')
    .order('property_category', { ascending: true })
    .order('property_name', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as SchedulableProperty[];
}


