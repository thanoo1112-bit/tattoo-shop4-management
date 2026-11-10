'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '../AppContext';
import { createClient } from '@/lib/supabase/client';
import {
  readAll,
  subscribeRescheduleRequests,
  isRescheduleRequestUiEnabled,
  normalizeBookingUuid,
} from '@/lib/reschedule/rescheduleRequestStore';
import { LayoutDashboard, Calendar, Users, DollarSign, Sparkles, Image as ImageIcon, Inbox } from 'lucide-react';

export default function ArtistMobileNav() {
  const pathname = usePathname();
  const activeTabRef = useRef<HTMLAnchorElement | null>(null);
  const { staffArtistId } = useApp();

  const [totalNotificationCount, setTotalNotificationCount] = useState<number>(0);

  // Fetch all 3 notification counts scoped strictly to the logged-in staffArtistId
  const fetchCounts = useCallback(async () => {
    if (!staffArtistId) {
      setTotalNotificationCount(0);
      return;
    }

    const supabase = createClient();

    try {
      // 1. Group 1: New Custom Requests for this artist
      const { count: customCount } = await supabase
        .from('estimate_requests')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', staffArtistId)
        .eq('status', 'PENDING')
        .neq('request_type', 'DIRECT_BOOKING');

      // 1b. Group 1: New Flash Requests for this artist
      let flashCount = 0;
      try {
        const { data: flashData, error: fErr } = await supabase
          .rpc('artist_get_flash_reservations', { p_artist_id: staffArtistId });
        if (!fErr && flashData) {
          flashCount = flashData.filter((r: any) => r.status === 'PENDING').length;
        }
      } catch (_) {}

      const reqCount = (customCount || 0) + flashCount;

      // 2. Group 2: New Deposit Slips for bookings belonging to this artist
      const { data: bData } = await supabase
        .from('bookings')
        .select('id')
        .eq('artist_id', staffArtistId);

      const bIds = (bData || []).map((b: any) => b.id);
      const bIdsSet = new Set(bIds.map((id: string) => normalizeBookingUuid(id)));

      let slipCount = 0;
      if (bIds.length > 0) {
        const { count } = await supabase
          .from('booking_payment_submissions')
          .select('id', { count: 'exact', head: true })
          .in('booking_id', bIds)
          .eq('status', 'PENDING');
        slipCount = count || 0;
      }

      // 3. Group 3: New Reschedule Requests for bookings belonging to this artist
      let pendingReschedule = 0;
      if (isRescheduleRequestUiEnabled()) {
        const all = readAll();
        pendingReschedule = all.filter(
          (r: any) =>
            r.status === 'PENDING' &&
            (r.artist_id === staffArtistId || (r.booking_id && bIdsSet.has(normalizeBookingUuid(r.booking_id))))
        ).length;
      }

      setTotalNotificationCount(reqCount + slipCount + pendingReschedule);
    } catch (err) {
      console.error('[ArtistMobileNav] Error fetching notification counts:', err);
    }
  }, [staffArtistId]);

  useEffect(() => {
    fetchCounts();

    const handleRealtime = () => {
      fetchCounts();
    };

    const handleFocus = () => {
      fetchCounts();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('artist:realtime', handleRealtime);
      window.addEventListener('focus', handleFocus);
      const unsubscribeReschedule = subscribeRescheduleRequests(fetchCounts);

      return () => {
        window.removeEventListener('artist:realtime', handleRealtime);
        window.removeEventListener('focus', handleFocus);
        unsubscribeReschedule();
      };
    }
  }, [fetchCounts]);

  const navItems = [
    { href: '/artist/dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
    { href: '/artist/requests', label: 'คำขอ', icon: Inbox },
    { href: '/artist/calendar', label: 'คิวงานและปฏิทิน', icon: Calendar },
    { href: '/artist/portfolio', label: 'ผลงาน', icon: ImageIcon },
    { href: '/artist/flash', label: 'ลาย Flash', icon: Sparkles },
    { href: '/artist/customers', label: 'ลูกค้า', icon: Users },
    { href: '/artist/revenue', label: 'รายได้', icon: DollarSign },
  ];

  // Auto-scroll the active tab into view when navigating on narrow mobile devices
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [pathname]);

  return (
    <nav
      aria-label="Artist Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 font-prompt pointer-events-none select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Bottom Bar Background Surface (Starts 12px below top to allow active icon to elevate above the bar line) */}
      <div className="absolute inset-x-0 bottom-0 top-[12px] bg-[#171512]/95 backdrop-blur-md border-t border-[#4A443A] shadow-2xl pointer-events-auto" />

      {/* Nav Items Scroll Track */}
      <div className="relative z-10 flex items-end justify-between px-2 pt-0 pb-1.5 overflow-x-auto scrollbar-none pointer-events-auto">
        <div className="flex items-end justify-around w-full min-w-max mx-auto space-x-1 px-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href === '/artist/calendar' && pathname === '/artist/queue');
            const Icon = item.icon;

            if (isActive) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  ref={activeTabRef}
                  className="flex flex-col items-center justify-end py-1 px-2 text-center shrink-0 min-w-[54px] relative"
                >
                  {/* Elevated Circle Icon (Elevated 12px above the bar line) */}
                  <div
                    className="w-[46px] h-[46px] rounded-full bg-[#C12D2D] text-[#ECE4D3] flex items-center justify-center border-2 border-[#171512] shadow-[0_4px_14px_rgba(156,47,47,0.45)] transition-transform duration-200 relative"
                  >
                    <Icon size={21} className="stroke-[2.2px]" />
                    {item.href === '/artist/requests' && totalNotificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[#ECE4D3] text-[#C12D2D] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-[#171512]">
                        {totalNotificationCount}
                      </span>
                    )}
                  </div>
                  {/* Active Label */}
                  <span className="text-[10px] font-bold text-[#C12D2D] whitespace-nowrap mt-1 tracking-tight leading-none">
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-end py-1 px-2 rounded-lg text-center transition-all shrink-0 active:scale-95 group min-w-[54px]"
              >
                {/* Standard Inactive Icon */}
                <div className="w-[32px] h-[32px] flex items-center justify-center relative">
                  <Icon size={18} className="text-[#A89F91] group-hover:text-[#ECE4D3] transition-colors stroke-[1.8px]" />
                  {item.href === '/artist/requests' && totalNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-2 bg-[#C12D2D] text-[#ECE4D3] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-[#171512]">
                      {totalNotificationCount}
                    </span>
                  )}
                </div>
                {/* Inactive Label */}
                <span className="text-[10px] font-medium text-[#7A7265] group-hover:text-[#ECE4D3] whitespace-nowrap mt-1 tracking-tight leading-none transition-colors">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
