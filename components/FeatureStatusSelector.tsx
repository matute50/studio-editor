import React from 'react';
import { Crown, Star, Sparkles, LayoutList } from 'lucide-react';

export type FeatureStatus = 'featured' | 'secondary' | 'tertiary' | 'standard' | '';

interface FeatureStatusSelectorProps {
    currentStatus: FeatureStatus;
    onStatusChange: (status: FeatureStatus) => void;
}

const statusOptions = [
    { id: 'featured', label: 'Portada', icon: Crown, color: 'text-amber-500' },
    { id: 'secondary', label: 'Secundaria', icon: Star, color: 'text-indigo-500' },
    { id: 'tertiary', label: 'Terciaria', icon: Sparkles, color: 'text-blue-500' },
    { id: 'standard', label: 'Estandar', icon: LayoutList, color: 'text-slate-400' }
] as const;

export const FeatureStatusSelector: React.FC<FeatureStatusSelectorProps> = ({ currentStatus, onStatusChange }) => {
    return (
        <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jerarquía Editorial</label>
            <div className="grid grid-cols-4 gap-2">
                {statusOptions.map((s) => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => onStatusChange(s.id as FeatureStatus)}
                        className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${currentStatus === s.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white hover:border-slate-200'
                            }`}
                    >
                        <s.icon size={20} className={`${currentStatus === s.id ? s.color : 'text-slate-300'} mb-1`} />
                        <span className="text-[8px] font-black uppercase">{s.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
