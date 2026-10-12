import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import { Save, Zap, Search, CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';

interface Station {
  id: string;
  name: string;
  sortOrder?: number;
}

interface RoomStationMappingViewProps {
  academicYear?: string;
  onSaved?: () => void;
  isEmbedded?: boolean;
}

export const RoomStationMappingView: React.FC<RoomStationMappingViewProps> = ({
  academicYear,
  onSaved,
  isEmbedded = true,
}) => {
  const [rooms, setRooms] = useState<string[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [initialMapping, setInitialMapping] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchMappings = useCallback(async () => {
    try {
      setLoading(true);
      const url = academicYear
        ? `/duty-schedule/room-mappings?academicYear=${encodeURIComponent(academicYear)}`
        : '/duty-schedule/room-mappings';
      const res = await api.get(url);
      const data = res.data.data;
      setRooms(data.rooms || []);
      setStations(data.stations || []);
      setMapping(data.mapping || {});
      setInitialMapping(data.mapping || {});
    } catch (err: any) {
      console.error(err);
      toast.error('Derslik ve nöbet yerleri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const hasChanges = useMemo(() => {
    const keys = Array.from(new Set([...Object.keys(mapping), ...Object.keys(initialMapping)]));
    return keys.some(k => (mapping[k] || '') !== (initialMapping[k] || ''));
  }, [mapping, initialMapping]);

  // Akıllı / Otomatik Eşleştirme Motoru
  const handleAutoMatch = () => {
    if (stations.length === 0) {
      toast.error('Tanımlı nöbet yeri bulunamadı.');
      return;
    }

    const dStation = stations.find(s => s.name.toUpperCase().includes('D -') || s.name.toUpperCase().includes('D KAT') || s.name.toUpperCase().includes('3. KAT'));
    const cStation = stations.find(s => s.name.toUpperCase().includes('C -') || s.name.toUpperCase().includes('C KAT') || s.name.toUpperCase().includes('2. KAT'));
    const bStation = stations.find(s => s.name.toUpperCase().includes('B -') || s.name.toUpperCase().includes('B KAT') || s.name.toUpperCase().includes('1. KAT'));
    const aStation = stations.find(s => s.name.toUpperCase().includes('A-') || s.name.toUpperCase().includes('ZEMİN') || s.name.toUpperCase().includes('ZEMIN'));
    const atolyeStation = stations.find(s => s.name.toUpperCase().includes('ATÖLYE') || s.name.toUpperCase().includes('ATOLYE') || s.name.toUpperCase().includes('MOTOR') || s.name.toUpperCase().includes('ARKA BAHÇE'));

    const newMapping = { ...mapping };
    let matchedCount = 0;

    rooms.forEach(room => {
      const rUpper = room.toUpperCase().trim();
      let targetId: string | undefined;

      if (rUpper.startsWith('D-') || rUpper.startsWith('D0') || rUpper.startsWith('D1') || rUpper.includes('/D-')) {
        targetId = dStation?.id;
      } else if (rUpper.startsWith('C-') || rUpper.startsWith('C0') || rUpper.startsWith('C1') || rUpper.includes('/C-')) {
        targetId = cStation?.id;
      } else if (rUpper.startsWith('B-') || rUpper.startsWith('B0') || rUpper.startsWith('B1') || rUpper.includes('/B-')) {
        targetId = bStation?.id;
      } else if (rUpper.includes('MOT') || rUpper.includes('OTOM') || rUpper.startsWith('A-35') || rUpper.startsWith('A35')) {
        targetId = atolyeStation?.id || aStation?.id;
      } else if (rUpper.startsWith('A-') || rUpper.startsWith('A0') || rUpper.startsWith('ZEMİN') || rUpper.includes('/A-')) {
        targetId = aStation?.id;
      }

      if (targetId && newMapping[room] !== targetId) {
        newMapping[room] = targetId;
        matchedCount++;
      }
    });

    setMapping(newMapping);
    if (matchedCount > 0) {
      toast.success(`${matchedCount} derslik otomatik eşleştirildi! Kontrol edip 'Kaydet'e basınız.`);
    } else {
      toast('Tüm derslikler zaten kurallara göre eşleşmiş durumda.', { icon: 'ℹ️' });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post('/duty-schedule/room-mappings', { mapping });
      setInitialMapping(mapping);
      toast.success('Derslik - Nöbet Yeri eşleştirmeleri başarıyla kaydedildi!');
      if (onSaved) onSaved();
    } catch (err: any) {
      console.error(err);
      toast.error('Eşleştirmeler kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchesSearch = room.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      const isAssigned = Boolean(mapping[room]);
      if (filter === 'assigned') return isAssigned;
      if (filter === 'unassigned') return !isAssigned;
      return true;
    });
  }, [rooms, search, filter, mapping]);

  const assignedCount = useMemo(() => {
    return rooms.filter(r => Boolean(mapping[r])).length;
  }, [rooms, mapping]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <RefreshCw className="animate-spin mb-2" size={24} />
        <p className="text-sm">Derslikler ve nöbet yerleri yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${isEmbedded ? '' : 'p-2'}`}>
      {/* Üst Bilgi ve Aksiyon Çubuğu */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Layers size={18} className="text-blue-600" />
            Derslik ➔ Nöbet Yeri Eşleştirmesi
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Boş derslerde o sınıfa en yakın nöbetçi öğretmenin (kat nöbetçisinin) öncelikli görevlendirilmesi için eşleştirin.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={handleAutoMatch}
            className="flex-1 sm:flex-none border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-blue-700 text-xs font-semibold"
          >
            <Zap size={14} className="text-blue-600" />
            Akıllı Eşleştir
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`flex-1 sm:flex-none text-xs font-bold ${
              hasChanges ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
            }`}
          >
            <Save size={14} />
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </div>

      {/* Arama & Filtreleme & İstatistik Barı */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Derslik ara... (Örn: D-04, B-01)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                filter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tümü ({rooms.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('assigned')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                filter === 'assigned' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Eşleşen ({assignedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unassigned')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                filter === 'unassigned' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Eşleşmeyen ({rooms.length - assignedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Derslik - Nöbet Yeri Eşleştirme Tablosu */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredRooms.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            {rooms.length === 0
              ? 'Ders programında tanımlı derslik bulunamadı.'
              : 'Arama kriterlerine uygun derslik bulunamadı.'}
          </div>
        ) : (
          <div className="max-h-[560px] overflow-y-auto divide-y divide-slate-100">
            {filteredRooms.map(room => {
              const currentStationId = mapping[room] || '';
              const isAssigned = Boolean(currentStationId);

              return (
                <div
                  key={room}
                  className={`flex items-center justify-between px-5 py-2.5 transition ${
                    isAssigned ? 'hover:bg-slate-50/60' : 'bg-amber-50/30 hover:bg-amber-50/60'
                  }`}
                >
                  {/* Derslik Adı / Kodu */}
                  <div className="flex items-center gap-3 w-1/3">
                    <span className="font-bold text-sm text-slate-800 font-mono tracking-wide">
                      {room}
                    </span>
                    {isAssigned ? (
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    ) : (
                      <AlertCircle size={15} className="text-amber-500 shrink-0" />
                    )}
                  </div>

                  {/* Nöbet Yeri Seçim Kutusu */}
                  <div className="w-2/3 max-w-md">
                    <select
                      value={currentStationId}
                      onChange={e => {
                        const newStationId = e.target.value;
                        setMapping(prev => ({ ...prev, [room]: newStationId }));
                      }}
                      className={`w-full px-3 py-2 text-xs sm:text-sm rounded-lg border font-medium transition focus:outline-none focus:ring-2 ${
                        isAssigned
                          ? 'border-blue-400 bg-white text-slate-800 focus:ring-blue-500'
                          : 'border-slate-300 bg-white text-slate-400 focus:ring-amber-500'
                      }`}
                    >
                      <option value="">-- Nöbet Yeri Seçiniz --</option>
                      {stations.map(st => (
                        <option key={st.id} value={st.id} className="text-slate-800 font-medium">
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {hasChanges && (
        <div className="flex justify-between items-center p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <span>Değişiklikler yapıldı ancak henüz kaydedilmedi.</span>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      )}
    </div>
  );
};
