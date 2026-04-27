import React from 'react';

interface ModuleStatsGridProps {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  stats: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    subtext?: string;
    color: string;
    highlight?: boolean;
  }>;
}

export const ModuleStatsGrid: React.FC<ModuleStatsGridProps> = ({
  title,
  description,
  icon: ModuleIcon,
  iconColor,
  stats,
}) => {
  const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
    emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-600' },
    green: { bg: 'bg-green-50', icon: 'bg-green-100 text-green-600', text: 'text-green-600' },
    teal: { bg: 'bg-teal-50', icon: 'bg-teal-100 text-teal-600', text: 'text-teal-600' },
    amber: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', text: 'text-amber-600' },
    orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600', text: 'text-orange-600' },
    red: { bg: 'bg-red-50', icon: 'bg-red-100 text-red-600', text: 'text-red-600' },
    cyan: { bg: 'bg-cyan-50', icon: 'bg-cyan-100 text-cyan-600', text: 'text-cyan-600' },
    blue: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600', text: 'text-orange-600' },
    violet: { bg: 'bg-violet-50', icon: 'bg-violet-100 text-violet-600', text: 'text-violet-600' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', text: 'text-purple-600' },
    pink: { bg: 'bg-pink-50', icon: 'bg-pink-100 text-pink-600', text: 'text-pink-600' },
    indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-100 text-indigo-600', text: 'text-indigo-600' },
    fuchsia: { bg: 'bg-fuchsia-50', icon: 'bg-fuchsia-100 text-fuchsia-600', text: 'text-fuchsia-600' },
    lime: { bg: 'bg-lime-50', icon: 'bg-lime-100 text-lime-600', text: 'text-lime-600' },
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 bg-gradient-to-br ${iconColor} rounded-xl flex items-center justify-center shadow-sm`}>
          <ModuleIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          {description && <p className="text-sm text-gray-400">{description}</p>}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {stats.map((stat, index) => {
          const colors = colorMap[stat.color] || colorMap.blue;
          const StatIcon = stat.icon;

          return (
            <div
              key={index}
              className={`${colors.bg} rounded-xl border border-gray-100/50 p-4 transition-all hover:shadow-md hover:scale-105 ${
                stat.highlight ? 'ring-2 ring-offset-1 ring-amber-400' : ''
              }`}
            >
              <div className={`w-10 h-10 ${colors.icon} rounded-xl flex items-center justify-center mb-3`}>
                <StatIcon className="w-5 h-5" />
              </div>
              <p className={`text-2xl font-bold text-gray-900 mb-0.5`}>
                {stat.value}
              </p>
              <p className="text-xs font-semibold text-gray-600">{stat.label}</p>
              {stat.subtext && <p className="text-[10px] text-gray-500 mt-1">{stat.subtext}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface TopItemsListProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{
    id: string | number;
    rank: number;
    name: string;
    subtitle?: string;
    value: string | number;
    trend?: number;
  }>;
  emptyText?: string;
  variant?: 'horizontal' | 'vertical';
}

export const TopItemsList: React.FC<TopItemsListProps> = ({
  title,
  icon: Icon,
  items,
  emptyText = 'Aucune donnée',
  variant = 'vertical',
}) => {
  if (variant === 'horizontal') {
    return (
      <div>
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Icon className="w-5 h-5" />
          {title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-gradient-to-br from-gray-50/80 to-gray-100/60 rounded-xl border border-gray-200/50 p-4 text-center hover:shadow-md transition-all"
              >
                <div className={`w-10 h-10 mx-auto mb-3 rounded-lg flex items-center justify-center text-white text-sm font-bold ${
                  item.rank === 1 ? 'bg-amber-500 shadow-lg shadow-amber-300' :
                  item.rank === 2 ? 'bg-gray-400' :
                  item.rank === 3 ? 'bg-orange-600' :
                  'bg-violet-500'
                }`}>
                  {item.rank}
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                {item.subtitle && <p className="text-xs text-gray-600 mt-1">{item.subtitle}</p>}
                <p className="text-lg font-bold text-gray-800 mt-2">{item.value}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-400 col-span-5 text-center py-4 text-sm">{emptyText}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5" />
        {title}
      </h3>
      <div className="space-y-2">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl p-3 border border-gray-100/50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                  item.rank === 1 ? 'bg-amber-500' :
                  item.rank === 2 ? 'bg-gray-400' :
                  item.rank === 3 ? 'bg-orange-600' :
                  'bg-violet-500'
                }`}>
                  {item.rank}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  {item.subtitle && <p className="text-xs text-gray-600">{item.subtitle}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-800">{item.value}</p>
                {item.trend !== undefined && (
                  <p className={`text-xs font-semibold ${item.trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {item.trend >= 0 ? '↑' : '↓'} {Math.abs(item.trend)}%
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center py-4 text-sm">{emptyText}</p>
        )}
      </div>
    </div>
  );
};

interface StatusDistributionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{
    label: string;
    count: number;
    color: string;
  }>;
}

export const StatusDistribution: React.FC<StatusDistributionProps> = ({
  title,
  icon: Icon,
  items,
}) => {
  const total = items.reduce((s, i) => s + i.count, 0) || 1;

  return (
    <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-4">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5" />
        {title}
      </h3>
      <div className="flex items-center justify-center gap-8">
        {/* Donut Chart */}
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {items.reduce((acc, item, i) => {
              const percent = (item.count / total) * 100;
              const offset = acc.offset;
              acc.elements.push(
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="20"
                  strokeDasharray={`${percent * 2.51} ${251 - percent * 2.51}`}
                  strokeDashoffset={-offset * 2.51}
                />
              );
              acc.offset += percent;
              return acc;
            }, { elements: [] as JSX.Element[], offset: 0 }).elements}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-800">{total}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
              <span className="text-sm text-gray-700">{item.label}</span>
              <span className="text-sm font-bold text-gray-900 ml-auto">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
