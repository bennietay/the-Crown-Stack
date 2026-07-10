import React, { useState } from "react";
import { Award, Info, Sparkles, TrendingUp, HelpCircle, Users } from "lucide-react";

export default function AmwayRoadmap() {
  const [personalPv, setPersonalPv] = useState(250);
  const [downlineLegs, setDownlineLegs] = useState(3);
  const [averageLegPv, setAverageLegPv] = useState(300);

  // Constants for Amway Malaysia
  const BV_MULTIPLIER = 4.3; // 1 PV = 4.3 BV roughly in RM

  // Helper to determine Performance Bracket Percentage
  const getCommissionPercentage = (pv: number): number => {
    if (pv >= 12500) return 0.21;
    if (pv >= 7500) return 0.18;
    if (pv >= 4500) return 0.15;
    if (pv >= 3000) return 0.12;
    if (pv >= 1750) return 0.09;
    if (pv >= 900) return 0.06;
    if (pv >= 250) return 0.03;
    return 0.0;
  };

  // Calculations
  const downlineTotalPv = downlineLegs * averageLegPv;
  const totalGroupPv = personalPv + downlineTotalPv;
  const groupPercentage = getCommissionPercentage(totalGroupPv);

  // Group Gross Commission
  const totalGroupBv = totalGroupPv * BV_MULTIPLIER;
  const grossGroupCommission = totalGroupBv * groupPercentage;

  // Single Leg Commission Payout
  const legPercentage = getCommissionPercentage(averageLegPv);
  const singleLegBv = averageLegPv * BV_MULTIPLIER;
  const singleLegCommission = singleLegBv * legPercentage;
  const totalLegsCommissionPayout = singleLegCommission * downlineLegs;

  // Net ABO Monthly Bonus in RM
  const netAboMonthlyBonus = Math.max(0, grossGroupCommission - totalLegsCommissionPayout);

  // Next bracket calculation
  const brackets = [250, 900, 1750, 3000, 4500, 7500, 12500];
  const nextBracket = brackets.find(b => b > totalGroupPv);
  const pvToNextBracket = nextBracket ? nextBracket - totalGroupPv : 0;
  const nextPercentage = nextBracket ? getCommissionPercentage(nextBracket) * 100 : 21;

  return (
    <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-5 font-sans">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-950 flex items-center space-x-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span>Interactive PV/BV Monthly Performance Roadmap</span>
        </h3>
        <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          Performance Plan
        </span>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        Amway Malaysia rewards you based on Point Value (PV) and Business Volume (BV). Drag sliders to simulate monthly direct sales and project your estimated performance bonus.
      </p>

      {/* Inputs sliders */}
      <div className="space-y-4 pt-1">
        {/* Personal PV */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-gray-700">
            <span className="flex items-center gap-1">
              Personal Sales (PV)
              <HelpCircle className="w-3 h-3 text-gray-400" title="Your personal customer retail volume" />
            </span>
            <span className="text-emerald-600 font-mono font-bold">{personalPv} PV</span>
          </div>
          <input
            id="personal-pv-slider"
            type="range"
            min="0"
            max="1000"
            step="50"
            value={personalPv}
            onChange={(e) => setPersonalPv(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-150 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[9px] text-gray-400">
            <span>0 PV</span>
            <span>500 PV</span>
            <span>1,000 PV</span>
          </div>
        </div>

        {/* Downline Legs Sponsoring */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-gray-700">
            <span className="flex items-center gap-1">
              Active Downline Legs
              <Users className="w-3 h-3 text-gray-400" title="Number of sponsored business teams" />
            </span>
            <span className="text-emerald-600 font-mono font-bold">{downlineLegs} teams</span>
          </div>
          <input
            id="downline-legs-slider"
            type="range"
            min="0"
            max="12"
            step="1"
            value={downlineLegs}
            onChange={(e) => setDownlineLegs(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-150 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[9px] text-gray-400">
            <span>0 legs</span>
            <span>6 legs</span>
            <span>12 legs</span>
          </div>
        </div>

        {/* Average PV per leg */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-gray-700">
            <span className="flex items-center gap-1">
              Average Volume Per Leg (PV)
              <HelpCircle className="w-3 h-3 text-gray-400" title="Average group volume of each sponsored leg" />
            </span>
            <span className="text-emerald-600 font-mono font-bold">{averageLegPv} PV</span>
          </div>
          <input
            id="average-leg-pv-slider"
            type="range"
            min="0"
            max="2500"
            step="50"
            value={averageLegPv}
            onChange={(e) => setAverageLegPv(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-150 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[9px] text-gray-400">
            <span>0 PV</span>
            <span>1,250 PV</span>
            <span>2,500 PV</span>
          </div>
        </div>
      </div>

      {/* Simulation Results Grid */}
      <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Group PV */}
        <div className="bg-white p-3 rounded-xl border border-gray-100 text-center flex flex-col justify-between">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Total Group PV</span>
          <span className="text-xl font-bold text-gray-950 mt-1 font-mono">{totalGroupPv} PV</span>
          <span className="text-[9px] text-gray-400 mt-1 block font-medium">Personal: {personalPv} • Downlines: {downlineTotalPv}</span>
        </div>

        {/* Performance Tier */}
        <div className="bg-white p-3 rounded-xl border border-gray-100 text-center flex flex-col justify-between">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Bonus Bracket (%)</span>
          <span className="text-xl font-bold text-emerald-600 mt-1 font-mono">{(groupPercentage * 100).toFixed(0)}%</span>
          <span className="text-[9px] text-gray-400 mt-1 block font-medium">Total Group BV: {totalGroupBv.toLocaleString()} BV</span>
        </div>

        {/* Estimated Monthly Income */}
        <div className="col-span-1 sm:col-span-2 bg-gradient-to-r from-emerald-600 to-teal-600 p-4.5 rounded-xl text-white text-center relative overflow-hidden shadow-sm">
          <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-white/10 rounded-full blur-[20px] pointer-events-none"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100 block">Estimated Performance Bonus</span>
          <span className="text-2xl font-bold font-mono mt-1 block">RM {netAboMonthlyBonus.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-[9px] text-emerald-100 mt-1.5 block">Estimated Gross Group Commission: RM {grossGroupCommission.toLocaleString(undefined, { maximumFractionDigits: 0 })} minus downline payouts.</span>
        </div>
      </div>

      {/* Predictive Roadmap Instructions */}
      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2 text-xs relative">
        <div className="flex items-center space-x-1 text-slate-800 font-bold">
          <Award className="w-4 h-4 text-indigo-500 animate-pulse" />
          <span>Predictive Action Plan</span>
        </div>
        {nextBracket ? (
          <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
            You are <span className="font-bold text-emerald-600 font-mono">{pvToNextBracket} PV</span> away from qualifying for the <span className="font-bold text-slate-800 font-mono">{nextPercentage}%</span> performance bracket. 
            <span className="block mt-1 bg-white p-2 rounded-lg border border-slate-100">
              💡 <span className="font-semibold text-slate-700">Roadmap Strategy:</span> Sponsoring <span className="font-bold text-indigo-600">{(pvToNextBracket / 150).toFixed(1)}</span> wellness customers on the popular Nutrilite pack (approx. 150 PV each) or welcoming <span className="font-bold text-indigo-600">{(pvToNextBracket / 300).toFixed(1)}</span> new active ABO partners will secure this tier increase!
            </span>
          </p>
        ) : (
          <p className="text-[11px] text-slate-600 leading-relaxed">
            🎉 <span className="font-bold text-emerald-600">Maximum 21% Silver Producer achieved!</span> Focus on helping your legs replicate this model to earn deep Leadership Bonuses and qualify for Diamond level!
          </p>
        )}
      </div>
    </div>
  );
}
