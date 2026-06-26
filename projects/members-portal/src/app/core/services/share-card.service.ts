import { Injectable } from '@angular/core';
import { getDayStatusesForRange, formatLocalDate } from '../utils/attendance-evaluator';

@Injectable({
  providedIn: 'root'
})
export class ShareCardService {

  /**
   * Generates a 9:16 PNG Blob of a badge achievement card.
   */
  generateShareCard(
    memberName: string,
    badges: Array<{ title: string; icon: string; requirement: string; id: string }>,
    streak: number
  ): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      // 1. Create off-screen canvas
      const width = 1080;
      const height = 1920;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not create Canvas 2D context.'));
        return;
      }

      try {
        // Load official logo image asynchronously
        const logoImg = await this.loadImage('assets/logo.png');

        // 2. Ensure fonts are loaded before drawing
        await document.fonts.ready;

        this.drawCard(ctx, width, height, memberName, badges, streak, logoImg);
        
        // 3. Convert to PNG Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate Canvas blob.'));
            }
          },
          'image/png',
          1.0
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Helper to load an image asynchronously.
   */
  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn(`Failed to load image: ${src}. Falling back to text logo.`);
        resolve(null as any);
      };
      img.src = src;
    });
  }

  /**
   * Helper to draw a soft gold glow radial gradient behind a badge socket.
   */
  private drawSocketGlow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
    const gradient = ctx.createRadialGradient(x, y, 10, x, y, radius * 2.2);
    gradient.addColorStop(0, 'rgba(212, 175, 55, 0.22)');
    gradient.addColorStop(1, 'rgba(10, 10, 11, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.2, 0, 2 * Math.PI);
    ctx.fill();
  }

  /**
   * Helper to draw a premium circular badge frame with emoji icon inside.
   */
  private drawBadgeSocket(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    icon: string,
    iconSize: number
  ) {
    // A. Socket Ambient Halo Glow
    this.drawSocketGlow(ctx, x, y, radius);

    // B. Drop Shadow for outer frame
    ctx.shadowColor = 'rgba(212, 175, 55, 0.35)';
    ctx.shadowBlur = 30;

    // C. Gold Frame Outer Ring & Fill
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(15, 15, 17, 0.95)';
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 5;
    ctx.stroke();

    // D. Subtle Inner Ring Accent
    ctx.beginPath();
    ctx.arc(x, y, radius - 10, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Reset shadow blur for future drawings
    ctx.shadowBlur = 0;

    // E. Draw Badge Icon (Emoji centered)
    ctx.font = `${iconSize}px "Inter", "Apple Color Emoji", "Segoe UI Emoji"`;
    ctx.fillText(icon, x, y + iconSize * 0.06);
  }

  /**
   * Helper to draw a sleek named pill directly below a badge socket.
   */
  private drawBadgePill(ctx: CanvasRenderingContext2D, x: number, y: number, title: string) {
    ctx.font = '900 18px "Oswald", sans-serif';
    try {
      (ctx as any).letterSpacing = '1px';
    } catch (e) {}
    const textWidth = ctx.measureText(title.toUpperCase()).width;
    try {
      (ctx as any).letterSpacing = '0px';
    } catch (e) {}

    const padX = 20;
    const padY = 10;
    const pillWidth = textWidth + padX * 2;
    const pillHeight = 36;
    const pillX = x - pillWidth / 2;
    const pillY = y - pillHeight / 2;
    const pillR = 18;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, pillR);
    } else {
      ctx.rect(pillX, pillY, pillWidth, pillHeight);
    }
    ctx.fillStyle = 'rgba(18, 18, 20, 0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 18px "Oswald", sans-serif';
    ctx.fillText(title.toUpperCase(), x, y + 1);
  }

  /**
   * Helper to draw the member profile and active streak details.
   */
  private drawMemberInfo(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    memberName: string,
    streak: number,
    startY: number
  ) {
    // Member Name
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 56px "Oswald", sans-serif';
    ctx.fillText(memberName.toUpperCase(), width / 2, startY);

    // Active Streak Fire Label
    if (streak > 0) {
      const streakText = `🔥  ${streak}-DAY STREAK`;
      ctx.font = '900 38px "Oswald", sans-serif';
      const textWidth = ctx.measureText(streakText).width;

      // Draw Streak Capsule Background
      const capWidth = textWidth + 80;
      const capHeight = 80;
      const capX = (width - capWidth) / 2;
      const capY = startY + 60;
      const capR = 40;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(capX, capY, capWidth, capHeight, capR);
      } else {
        ctx.rect(capX, capY, capWidth, capHeight);
      }
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#f87171';
      ctx.fillText(streakText, width / 2, capY + capHeight / 2 + 2);
    } else {
      ctx.fillStyle = '#a0a0ab';
      ctx.font = 'bold 24px "Inter", sans-serif';
      ctx.fillText('CRUSHING GYM GOALS DAILY', width / 2, startY + 90);
    }
  }

  /**
   * Draws the visual elements of the share card.
   */
  private drawCard(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    memberName: string,
    badges: Array<{ title: string; icon: string; requirement: string; id: string }>,
    streak: number,
    logoImg: HTMLImageElement | null
  ) {
    // A. Dark Charcoal Background
    ctx.fillStyle = '#0a0a0b';
    ctx.fillRect(0, 0, width, height);

    // B. Outer Border (Sleek Gold Outline)
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#d4af37';
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // C. Radial Gradient Ambient Glow (Center-Backdrop)
    const glowX = width / 2;
    const glowY = height / 2 - 100;
    const innerRadius = 50;
    const outerRadius = 550;
    const gradient = ctx.createRadialGradient(glowX, glowY, innerRadius, glowX, glowY, outerRadius);
    gradient.addColorStop(0, 'rgba(212, 175, 55, 0.08)');
    gradient.addColorStop(1, 'rgba(10, 10, 11, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(48, 48, width - 96, height - 96);

    // D. Header - Epicenter Fitness Gym Logo
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (logoImg) {
      // Draw actual brand image logo
      const logoWidth = 130;
      const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
      const logoX = width / 2 - logoWidth / 2;
      const logoY = 110;

      // Soft gold halo glow behind logo
      ctx.shadowColor = 'rgba(212, 175, 55, 0.3)';
      ctx.shadowBlur = 20;
      ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
      ctx.shadowBlur = 0; // reset shadow
    } else {
      // Fallback: draw circular badge
      const logoX = width / 2;
      const logoY = 180;
      const logoR = 45;
      ctx.beginPath();
      ctx.arc(logoX, logoY, logoR, 0, 2 * Math.PI);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#d4af37';
      ctx.font = '900 36px "Oswald", sans-serif';
      ctx.fillText('EF', logoX, logoY + 2);
    }

    // Logo Text underneath
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px "Oswald", sans-serif';
    try {
      (ctx as any).letterSpacing = '6px';
    } catch (e) {}
    ctx.fillText('EPICENTER PORTAL', width / 2, 285);
    try {
      (ctx as any).letterSpacing = '0px'; // reset
    } catch (e) {}

    ctx.fillStyle = '#a0a0ab';
    ctx.font = 'bold 20px "Inter", sans-serif';
    ctx.fillText('FITNESS • PERFORMANCE • COMMUNITY', width / 2, 330);

    // E. Central Badges Showcase Rendering (1, 2, or 3 Badges)
    const numBadges = badges.length;

    if (numBadges === 1) {
      // Single Badge Layout (Default)
      const badge = badges[0];
      const badgeX = width / 2;
      const badgeY = height / 2 - 150;
      const frameSize = 210;

      this.drawBadgeSocket(ctx, badgeX, badgeY, frameSize, badge.icon, 160);

      // Achievement Titles
      ctx.fillStyle = '#a0a0ab';
      ctx.font = '900 32px "Oswald", sans-serif';
      try {
        (ctx as any).letterSpacing = '4px';
      } catch (e) {}
      ctx.fillText('ACHIEVEMENT UNLOCKED', width / 2, height / 2 + 150);
      try {
        (ctx as any).letterSpacing = '0px';
      } catch (e) {}

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 80px "Oswald", sans-serif';
      ctx.fillText(badge.title.toUpperCase(), width / 2, height / 2 + 230);

      ctx.fillStyle = '#d4af37';
      ctx.font = 'bold 26px "Inter", sans-serif';
      ctx.fillText(badge.requirement, width / 2, height / 2 + 290);

      // Divider
      ctx.beginPath();
      ctx.moveTo(width / 2 - 150, height / 2 + 350);
      ctx.lineTo(width / 2 + 150, height / 2 + 350);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Member Info
      this.drawMemberInfo(ctx, width, height, memberName, streak, height / 2 + 430);

    } else if (numBadges === 2) {
      // 2 Badges Layout
      const centerY = height / 2 - 180;
      const leftX = width / 2 - 200;
      const rightX = width / 2 + 200;
      const frameRadius = 145;

      // Draw dashed connection line first
      ctx.beginPath();
      ctx.moveTo(leftX, centerY);
      ctx.lineTo(rightX, centerY);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
      ctx.lineWidth = 4;
      try {
        ctx.setLineDash([12, 12]);
      } catch (e) {}
      ctx.stroke();
      try {
        ctx.setLineDash([]); // reset dash
      } catch (e) {}

      // Draw Left Badge and naming pill
      this.drawBadgeSocket(ctx, leftX, centerY, frameRadius, badges[0].icon, 110);
      this.drawBadgePill(ctx, leftX, centerY + frameRadius + 30, badges[0].title);

      // Draw Right Badge and naming pill
      this.drawBadgeSocket(ctx, rightX, centerY, frameRadius, badges[1].icon, 110);
      this.drawBadgePill(ctx, rightX, centerY + frameRadius + 30, badges[1].title);

      // Titles & Badging Header
      ctx.fillStyle = '#a0a0ab';
      ctx.font = '900 32px "Oswald", sans-serif';
      try {
        (ctx as any).letterSpacing = '4px';
      } catch (e) {}
      ctx.fillText('EQUIPPED SHOWCASE', width / 2, height / 2 + 150);
      try {
        (ctx as any).letterSpacing = '0px';
      } catch (e) {}

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 48px "Oswald", sans-serif';
      ctx.fillText('ACTIVE PRESTIGE LOCKER', width / 2, height / 2 + 210);

      ctx.fillStyle = '#d4af37';
      ctx.font = 'bold 24px "Inter", sans-serif';
      ctx.fillText('DISPLAYING COMPLETED GYM CHALLENGES', width / 2, height / 2 + 265);

      // Divider
      ctx.beginPath();
      ctx.moveTo(width / 2 - 150, height / 2 + 320);
      ctx.lineTo(width / 2 + 150, height / 2 + 320);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Member Info
      this.drawMemberInfo(ctx, width, height, memberName, streak, height / 2 + 395);

    } else if (numBadges === 3) {
      // 3 Badges Layout (Triangular Constellation)
      const centerY = height / 2 - 160;
      const topX = width / 2;
      const topY = centerY - 170;
      const bLeftX = width / 2 - 190;
      const bLeftY = centerY + 120;
      const bRightX = width / 2 + 190;
      const bRightY = centerY + 120;
      const frameRadius = 130;

      // Draw constellation connecting lines
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.lineTo(bLeftX, bLeftY);
      ctx.lineTo(bRightX, bRightY);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
      ctx.lineWidth = 4;
      try {
        ctx.setLineDash([12, 12]);
      } catch (e) {}
      ctx.stroke();
      try {
        ctx.setLineDash([]); // reset dash
      } catch (e) {}

      // Draw Sockets and pills
      this.drawBadgeSocket(ctx, topX, topY, frameRadius, badges[0].icon, 95);
      this.drawBadgePill(ctx, topX, topY + frameRadius + 30, badges[0].title);

      this.drawBadgeSocket(ctx, bLeftX, bLeftY, frameRadius, badges[1].icon, 95);
      this.drawBadgePill(ctx, bLeftX, bLeftY + frameRadius + 30, badges[1].title);

      this.drawBadgeSocket(ctx, bRightX, bRightY, frameRadius, badges[2].icon, 95);
      this.drawBadgePill(ctx, bRightX, bRightY + frameRadius + 30, badges[2].title);

      // Titles & Badging Header
      ctx.fillStyle = '#a0a0ab';
      ctx.font = '900 32px "Oswald", sans-serif';
      try {
        (ctx as any).letterSpacing = '4px';
      } catch (e) {}
      ctx.fillText('EQUIPPED SHOWCASE', width / 2, height / 2 + 250);
      try {
        (ctx as any).letterSpacing = '0px';
      } catch (e) {}

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 48px "Oswald", sans-serif';
      ctx.fillText('ELITE TROPHY CONSTELLATION', width / 2, height / 2 + 310);

      // Divider
      ctx.beginPath();
      ctx.moveTo(width / 2 - 150, height / 2 + 370);
      ctx.lineTo(width / 2 + 150, height / 2 + 370);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Member Info
      this.drawMemberInfo(ctx, width, height, memberName, streak, height / 2 + 440);
    }

    // F. Branded Footer
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 24px "Inter", sans-serif';
    try {
      (ctx as any).letterSpacing = '1px';
    } catch (e) {}
    ctx.fillText('PROUD MEMBER OF EPICENTER FITNESS', width / 2, height - 150);
    try {
      (ctx as any).letterSpacing = '0px';
    } catch (e) {}

    ctx.fillStyle = '#d4af37';
    ctx.font = '900 28px "Oswald", sans-serif';
    try {
      (ctx as any).letterSpacing = '2px';
    } catch (e) {}
    ctx.fillText('EPICENTER FITNESS GYM', width / 2, height - 100);
    try {
      (ctx as any).letterSpacing = '0px';
    } catch (e) {}
  }

  /**
   * Generates a 9:16 PNG Blob of a consistency check-in calendar card.
   */
  generateConsistencyCard(
    memberName: string,
    streak: number,
    highestBadge: { title: string; icon: string } | null,
    attendanceDates: string[]
  ): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      const width = 1080;
      const height = 1920;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not create Canvas 2D context.'));
        return;
      }

      try {
        // Load official logo image asynchronously
        const logoImg = await this.loadImage('assets/logo.png');

        // Ensure fonts are loaded
        await document.fonts.ready;

        this.drawConsistencyCard(ctx, width, height, memberName, streak, highestBadge, attendanceDates, logoImg);

        // Convert to Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate Canvas blob.'));
            }
          },
          'image/png',
          1.0
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Renders the visual elements of the consistency card.
   */
  private drawConsistencyCard(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    memberName: string,
    streak: number,
    highestBadge: { title: string; icon: string } | null,
    attendanceDates: string[],
    logoImg: HTMLImageElement | null
  ) {
    // 1. Dark Charcoal Background
    ctx.fillStyle = '#0a0a0b';
    ctx.fillRect(0, 0, width, height);

    // 2. Outer Border (Sleek Gold Outline)
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#d4af37';
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // 3. Radial Gradient Backdrop Glow
    const glowX = width / 2;
    const glowY = height / 2 + 50;
    const innerRadius = 50;
    const outerRadius = 600;
    const gradient = ctx.createRadialGradient(glowX, glowY, innerRadius, glowX, glowY, outerRadius);
    gradient.addColorStop(0, 'rgba(212, 175, 55, 0.08)');
    gradient.addColorStop(1, 'rgba(10, 10, 11, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(48, 48, width - 96, height - 96);

    // 4. Header - Brand Logo
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (logoImg) {
      const logoWidth = 130;
      const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
      ctx.shadowColor = 'rgba(212, 175, 55, 0.3)';
      ctx.shadowBlur = 20;
      ctx.drawImage(logoImg, width / 2 - logoWidth / 2, 110, logoWidth, logoHeight);
      ctx.shadowBlur = 0;
    } else {
      const logoX = width / 2;
      const logoY = 180;
      const logoR = 45;
      ctx.beginPath();
      ctx.arc(logoX, logoY, logoR, 0, 2 * Math.PI);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#d4af37';
      ctx.font = '900 36px "Oswald", sans-serif';
      ctx.fillText('EF', logoX, logoY + 2);
    }

    // Logo text
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px "Oswald", sans-serif';
    try {
      (ctx as any).letterSpacing = '6px';
    } catch (e) {}
    ctx.fillText('EPICENTER PORTAL', width / 2, 285);
    try {
      (ctx as any).letterSpacing = '0px';
    } catch (e) {}

    ctx.fillStyle = '#a0a0ab';
    ctx.font = 'bold 20px "Inter", sans-serif';
    ctx.fillText('FITNESS • PERFORMANCE • COMMUNITY', width / 2, 330);

    // 5. Highest Attendance Badge Display
    const socketX = width / 2;
    const socketY = 490;
    const socketR = 80;

    if (highestBadge) {
      // Draw Unlocked Badge Frame
      this.drawBadgeSocket(ctx, socketX, socketY, socketR, highestBadge.icon, 75);
      
      // Draw Title Pill
      this.drawBadgePill(ctx, socketX, socketY + socketR + 25, highestBadge.title);

      // Subtitle
      ctx.fillStyle = '#a0a0ab';
      ctx.font = '900 16px "Oswald", sans-serif';
      try {
        (ctx as any).letterSpacing = '2px';
      } catch (e) {}
      ctx.fillText('HIGHEST ATTENDANCE RANK', width / 2, socketY + socketR + 68);
      try {
        (ctx as any).letterSpacing = '0px';
      } catch (e) {}
    } else {
      // Draw Placeholder Recruit Frame (Muted Gray Theme)
      ctx.shadowColor = 'rgba(102, 102, 102, 0.2)';
      ctx.shadowBlur = 20;

      ctx.beginPath();
      ctx.arc(socketX, socketY, socketR, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(15, 15, 17, 0.95)';
      ctx.fill();
      ctx.strokeStyle = '#4b5563'; // gray border
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Draw Recruit Icon
      ctx.font = '70px "Inter", "Apple Color Emoji", "Segoe UI Emoji"';
      ctx.fillStyle = '#4b5563';
      ctx.fillText('🏋️', socketX, socketY + 5);

      // Draw Pill for Recruit
      this.drawBadgePillCustom(ctx, socketX, socketY + socketR + 25, 'ACTIVE RECRUIT', 'rgba(75, 85, 99, 0.15)', 'rgba(75, 85, 99, 0.5)');

      // Subtitle
      ctx.fillStyle = '#666666';
      ctx.font = '900 16px "Oswald", sans-serif';
      try {
        (ctx as any).letterSpacing = '1px';
      } catch (e) {}
      ctx.fillText('ATTENDANCE LEVEL 0', width / 2, socketY + socketR + 68);
      try {
        (ctx as any).letterSpacing = '0px';
      } catch (e) {}
    }

    // 6. Generate Month Check-In Calendar Days
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const monthNames = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    const monthTitle = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();

    const days = [];

    // Fill offsets from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        dayNumber: prevDate.getDate(),
        isCurrentMonth: false,
        status: 'None',
        dateStr: formatLocalDate(prevDate)
      });
    }

    // Load actual statuses
    const startStr = formatLocalDate(firstDay);
    const endStr = formatLocalDate(lastDay);
    const statuses = getDayStatusesForRange(attendanceDates, startStr, endStr);
    const statusMap = new Map(statuses.map(s => [s.dateStr, s.status]));
    const todayStr = formatLocalDate(now);

    // Fill current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const currentDate = new Date(year, month, i);
      const dateStr = formatLocalDate(currentDate);

      let status = 'None';
      if (dateStr > todayStr) {
        status = 'Future';
      } else {
        const computedStatus = statusMap.get(dateStr) || 'Absent';
        if (dateStr === todayStr && computedStatus === 'Absent') {
          status = 'None';
        } else {
          status = computedStatus;
        }
      }

      days.push({
        dayNumber: i,
        isCurrentMonth: true,
        status,
        dateStr
      });
    }

    // Pad next month offsets to complete row
    const endOffset = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= endOffset; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        dayNumber: i,
        isCurrentMonth: false,
        status: 'None',
        dateStr: formatLocalDate(nextDate)
      });
    }

    const rowsCount = days.length / 7;
    const cellSize = 84;
    const cellGap = 14;
    const gridWidth = 7 * cellSize + 6 * cellGap; // 672px
    const startX = width / 2 - gridWidth / 2; // 204px
    const startY = 810;

    // A. Month Title Header
    ctx.fillStyle = '#d4af37';
    ctx.font = '900 40px "Oswald", sans-serif';
    try {
      (ctx as any).letterSpacing = '2px';
    } catch (e) {}
    ctx.fillText(monthTitle, width / 2, 715);
    try {
      (ctx as any).letterSpacing = '0px';
    } catch (e) {}

    // B. Weekdays Row
    const weekLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    ctx.fillStyle = '#a0a0ab';
    ctx.font = '900 20px "Oswald", sans-serif';
    for (let i = 0; i < 7; i++) {
      const labelX = startX + i * (cellSize + cellGap) + cellSize / 2;
      ctx.fillText(weekLabels[i], labelX, 765);
    }

    // C. Draw Calendar Grid Days
    for (let idx = 0; idx < days.length; idx++) {
      const day = days[idx];
      const col = idx % 7;
      const row = Math.floor(idx / 7);

      const cellX = startX + col * (cellSize + cellGap);
      const cellY = startY + row * (cellSize + cellGap);

      // Draw rounded background block
      this.drawRoundedRect(ctx, cellX, cellY, cellSize, cellSize, 12);

      let cellFill = '#121214';
      let cellStroke = 'rgba(255, 255, 255, 0.04)';
      let textFill = 'rgba(255, 255, 255, 0.08)';
      let hasIcon = false;
      let iconEmoji = '';
      let iconSize = 28;

      if (day.isCurrentMonth) {
        if (day.status === 'Future') {
          cellFill = '#121214';
          cellStroke = 'rgba(255, 255, 255, 0.08)';
          textFill = 'rgba(255, 255, 255, 0.25)';
        } else if (day.status === 'Present') {
          cellFill = '#d4af37';
          cellStroke = '#d4af37';
          textFill = '#000000';
          hasIcon = true;
          iconEmoji = '🏋️';
        } else if (day.status === 'Rest') {
          cellFill = 'rgba(71, 85, 105, 0.25)';
          cellStroke = 'rgba(71, 85, 105, 0.45)';
          textFill = '#94a3b8';
          hasIcon = true;
          iconEmoji = '🛌';
        } else if (day.status === 'Absent') {
          cellFill = 'rgba(239, 68, 68, 0.15)';
          cellStroke = 'rgba(239, 68, 68, 0.35)';
          textFill = '#f87171';
          hasIcon = true;
          iconEmoji = '❌';
          iconSize = 22;
        }
      }

      // Draw cell fill & stroke
      ctx.fillStyle = cellFill;
      ctx.fill();
      ctx.strokeStyle = cellStroke;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw day number in top-left corner
      ctx.fillStyle = textFill;
      ctx.font = '900 16px "Oswald", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(day.dayNumber.toString(), cellX + 8, cellY + 8);

      // Draw centered status icon
      if (hasIcon) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${iconSize}px "Inter", "Apple Color Emoji", "Segoe UI Emoji"`;
        ctx.fillText(iconEmoji, cellX + cellSize / 2, cellY + cellSize / 2 + 5);
      }
    }

    // 7. Consistency Motivation Quote Section (Dynamic positioning)
    const gridHeight = rowsCount * cellSize + (rowsCount - 1) * cellGap;
    const quoteY = startY + gridHeight + 35;

    // Quote Border Accents
    ctx.beginPath();
    ctx.moveTo(width / 2 - 80, quoteY);
    ctx.lineTo(width / 2 + 80, quoteY);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#d4af37';
    ctx.font = 'italic 900 28px "Oswald", sans-serif';
    ctx.fillText('“ SUCCESS IS NOT ABOUT GREATNESS. ”', width / 2, quoteY + 45);
    ctx.fillText('“ IT’S ABOUT CONSISTENCY. ”', width / 2, quoteY + 85);

    ctx.beginPath();
    ctx.moveTo(width / 2 - 80, quoteY + 130);
    ctx.lineTo(width / 2 + 80, quoteY + 130);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 8. Member Profile Info & Active Streak
    const profileY = quoteY + 195;
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 56px "Oswald", sans-serif';
    ctx.fillText(memberName.toUpperCase(), width / 2, profileY);

    if (streak > 0) {
      const streakText = `🔥  ${streak}-DAY CONSISTENCY STREAK`;
      ctx.font = '900 38px "Oswald", sans-serif';
      const textWidth = ctx.measureText(streakText).width;

      const capWidth = textWidth + 80;
      const capHeight = 80;
      const capX = (width - capWidth) / 2;
      const capY = profileY + 50;
      const capR = 40;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(capX, capY, capWidth, capHeight, capR);
      } else {
        ctx.rect(capX, capY, capWidth, capHeight);
      }
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#f87171';
      ctx.fillText(streakText, width / 2, capY + capHeight / 2 + 2);
    } else {
      ctx.fillStyle = '#a0a0ab';
      ctx.font = 'bold 24px "Inter", sans-serif';
      ctx.fillText('CRUSHING GYM GOALS DAILY', width / 2, profileY + 80);
    }

    // 9. Branded Footer
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 24px "Inter", sans-serif';
    try {
      (ctx as any).letterSpacing = '1px';
    } catch (e) {}
    ctx.fillText('PROUD MEMBER OF EPICENTER FITNESS', width / 2, height - 150);
    try {
      (ctx as any).letterSpacing = '0px';
    } catch (e) {}

    ctx.fillStyle = '#d4af37';
    ctx.font = '900 28px "Oswald", sans-serif';
    try {
      (ctx as any).letterSpacing = '2px';
    } catch (e) {}
    ctx.fillText('EPICENTER FITNESS GYM', width / 2, height - 100);
    try {
      (ctx as any).letterSpacing = '0px';
    } catch (e) {}
  }

  /**
   * Helper to draw custom colored pills.
   */
  private drawBadgePillCustom(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    title: string,
    bgFill: string,
    borderStroke: string
  ) {
    ctx.font = '900 18px "Oswald", sans-serif';
    try {
      (ctx as any).letterSpacing = '1px';
    } catch (e) {}
    const textWidth = ctx.measureText(title.toUpperCase()).width;
    try {
      (ctx as any).letterSpacing = '0px';
    } catch (e) {}

    const padX = 20;
    const pillWidth = textWidth + padX * 2;
    const pillHeight = 36;
    const pillX = x - pillWidth / 2;
    const pillY = y - pillHeight / 2;
    const pillR = 18;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, pillR);
    } else {
      ctx.rect(pillX, pillY, pillWidth, pillHeight);
    }
    ctx.fillStyle = bgFill;
    ctx.fill();
    ctx.strokeStyle = borderStroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 18px "Oswald", sans-serif';
    ctx.fillText(title.toUpperCase(), x, y + 1);
  }

  /**
   * Custom rounded rectangle drawer helper.
   */
  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Generates a 9:16 PNG Blob of the biometrics somatic checkup overview card.
   */
  generateSomaticCard(
    memberName: string,
    somaticData: {
      weight: number;
      bodyFat: number;
      muscleMass: number;
      bmi: number;
      metabolism: number;
      bodyAge: number;
      date: any;
    },
    trends: {
      weightDelta: number;
      bodyFatDelta: number;
      muscleMassDelta: number;
    },
    streak: number
  ): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      const width = 1080;
      const height = 1920;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not create Canvas 2D context.'));
        return;
      }

      try {
        // Load official logo image asynchronously
        const logoImg = await this.loadImage('assets/logo.png');

        // Ensure fonts are loaded
        await document.fonts.ready;

        this.drawSomaticCard(ctx, width, height, memberName, somaticData, trends, streak, logoImg);

        // Convert to Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate Canvas blob.'));
            }
          },
          'image/png',
          1.0
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Renders the visual elements of the somatic checkup overview card.
   */
  private drawSomaticCard(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    memberName: string,
    somaticData: {
      weight: number;
      bodyFat: number;
      muscleMass: number;
      bmi: number;
      metabolism: number;
      bodyAge: number;
      date: any;
    },
    trends: {
      weightDelta: number;
      bodyFatDelta: number;
      muscleMassDelta: number;
    },
    streak: number,
    logoImg: HTMLImageElement | null
  ) {
    // 1. Dark Charcoal Background
    ctx.fillStyle = '#0a0a0b';
    ctx.fillRect(0, 0, width, height);

    // 2. Outer Border (Sleek Gold Outline)
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#d4af37';
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // 3. Radial Gradient Ambient Glow
    const glowX = width / 2;
    const glowY = height / 2 - 100;
    const innerRadius = 50;
    const outerRadius = 600;
    const gradient = ctx.createRadialGradient(glowX, glowY, innerRadius, glowX, glowY, outerRadius);
    gradient.addColorStop(0, 'rgba(212, 175, 55, 0.08)');
    gradient.addColorStop(1, 'rgba(10, 10, 11, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(48, 48, width - 96, height - 96);

    // 4. Header - Brand Logo
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (logoImg) {
      const logoWidth = 130;
      const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
      ctx.shadowColor = 'rgba(212, 175, 55, 0.3)';
      ctx.shadowBlur = 20;
      ctx.drawImage(logoImg, width / 2 - logoWidth / 2, 110, logoWidth, logoHeight);
      ctx.shadowBlur = 0;
    } else {
      const logoX = width / 2;
      const logoY = 180;
      const logoR = 45;
      ctx.beginPath();
      ctx.arc(logoX, logoY, logoR, 0, 2 * Math.PI);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#d4af37';
      ctx.font = '900 36px "Oswald", sans-serif';
      ctx.fillText('EF', logoX, logoY + 2);
    }

    // Logo text
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px "Oswald", sans-serif';
    try {
      (ctx as any).letterSpacing = '6px';
    } catch (e) {}
    ctx.fillText('EPICENTER PORTAL', width / 2, 285);
    try {
      (ctx as any).letterSpacing = '0px';
    } catch (e) {}

    ctx.fillStyle = '#a0a0ab';
    ctx.font = 'bold 20px "Inter", sans-serif';
    ctx.fillText('FITNESS • PERFORMANCE • COMMUNITY', width / 2, 330);

    // 5. Section Header
    ctx.fillStyle = '#d4af37';
    ctx.font = '900 44px "Oswald", sans-serif';
    try {
      (ctx as any).letterSpacing = '2px';
    } catch (e) {}
    ctx.fillText('RECENT SOMATIC OVERVIEW', width / 2, 385);
    try {
      (ctx as any).letterSpacing = '0px';
    } catch (e) {}

    // Formatted Checkup Date
    let checkupDate = somaticData?.date;
    if (checkupDate && typeof checkupDate.toDate === 'function') {
      checkupDate = checkupDate.toDate();
    } else if (checkupDate && !(checkupDate instanceof Date)) {
      checkupDate = new Date(checkupDate);
    }
    const checkupDateStr = checkupDate instanceof Date
      ? checkupDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'N/A';
    
    ctx.fillStyle = '#a0a0ab';
    ctx.font = 'bold 20px "Inter", sans-serif';
    ctx.fillText(`Biometrics from body checkup on ${checkupDateStr}`, width / 2, 435);

    // 6. Draw 3 Main Metrics Cards (Weight, Fat %, Muscle %)
    const cardWidth = 800;
    const cardHeight = 180;
    const cardX = width / 2 - cardWidth / 2; // 140px
    const cardRadii = 24;

    const metrics = [
      {
        label: 'BODY WEIGHT',
        value: somaticData?.weight ? somaticData.weight.toString() : 'N/A',
        unit: 'kg',
        deltaText: trends?.weightDelta < 0 
          ? `↓ ${Math.abs(trends.weightDelta).toFixed(1)} kg vs last check`
          : trends?.weightDelta > 0
            ? `↑ ${trends.weightDelta.toFixed(1)} kg vs last check`
            : 'No change vs last check',
        deltaColor: trends?.weightDelta < 0
          ? '#10b981' // green
          : trends?.weightDelta > 0
            ? '#d4af37' // gold (neutral weight gain)
            : '#a0a0ab'
      },
      {
        label: 'BODY FAT',
        value: somaticData?.bodyFat ? somaticData.bodyFat.toString() : 'N/A',
        unit: '%',
        deltaText: trends?.bodyFatDelta < 0
          ? `↓ ${Math.abs(trends.bodyFatDelta).toFixed(1)}% vs last check`
          : trends?.bodyFatDelta > 0
            ? `↑ ${trends.bodyFatDelta.toFixed(1)}% vs last check`
            : 'No change vs last check',
        deltaColor: trends?.bodyFatDelta < 0
          ? '#10b981' // green (favorable fat loss)
          : trends?.bodyFatDelta > 0
            ? '#ef4444' // red (unfavorable fat gain)
            : '#a0a0ab'
      },
      {
        label: 'MUSCLE MASS',
        value: somaticData?.muscleMass ? somaticData.muscleMass.toString() : 'N/A',
        unit: '%',
        deltaText: trends?.muscleMassDelta > 0
          ? `↑ ${trends.muscleMassDelta.toFixed(1)}% vs last check`
          : trends?.muscleMassDelta < 0
            ? `↓ ${Math.abs(trends.muscleMassDelta).toFixed(1)}% vs last check`
            : 'No change vs last check',
        deltaColor: trends?.muscleMassDelta > 0
          ? '#10b981' // green (favorable muscle gain)
          : trends?.muscleMassDelta < 0
            ? '#ef4444' // red (unfavorable muscle loss)
            : '#a0a0ab'
      }
    ];

    const cardStartY = 480;
    const cardGap = 30;

    for (let i = 0; i < metrics.length; i++) {
      const m = metrics[i];
      const cardY = cardStartY + i * (cardHeight + cardGap);

      // Card Background with rounded corners
      this.drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadii);
      ctx.fillStyle = '#121214';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Label
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.font = '900 24px "Oswald", sans-serif';
      ctx.fillStyle = '#a0a0ab';
      ctx.fillText(m.label, cardX + 45, cardY + 45);

      // Draw Value in Gold
      ctx.font = '900 64px "Oswald", sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.fillText(m.value, cardX + 45, cardY + 112);
      const valWidth = ctx.measureText(m.value).width;

      // Draw Unit (kg or %) in White
      ctx.font = 'bold 26px "Inter", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(' ' + m.unit, cardX + 45 + valWidth, cardY + 110);

      // Draw Delta Trend Text
      ctx.font = 'bold 22px "Inter", sans-serif';
      ctx.fillStyle = m.deltaColor;
      ctx.fillText(m.deltaText, cardX + 45, cardY + 155);
    }

    // 7. Draw Secondary Metrics 2x2 Grid
    const gridY = 1110;
    const gridBoxW = 385;
    const gridBoxH = 100;
    const gridGapX = 30;
    const gridGapY = 20;

    const secondaryStats = [
      { label: 'BMI SCORE', value: somaticData?.bmi ? somaticData.bmi.toString() : 'N/A' },
      { label: 'BASAL METABOLISM', value: somaticData?.metabolism ? `${somaticData.metabolism} kcal` : 'N/A' },
      { label: 'BODY AGE', value: somaticData?.bodyAge ? `${somaticData.bodyAge} Years` : 'N/A' },
      { label: 'LAST CHECK DATE', value: checkupDateStr }
    ];

    for (let i = 0; i < secondaryStats.length; i++) {
      const stat = secondaryStats[i];
      const col = i % 2;
      const row = Math.floor(i / 2);

      const boxX = cardX + col * (gridBoxW + gridGapX);
      const boxY = gridY + row * (gridBoxH + gridGapY);

      // Draw rounded container block
      this.drawRoundedRect(ctx, boxX, boxY, gridBoxW, gridBoxH, 16);
      ctx.fillStyle = '#121214';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Title
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.font = '900 16px "Oswald", sans-serif';
      ctx.fillStyle = '#a0a0ab';
      ctx.fillText(stat.label, boxX + 25, boxY + 35);

      // Value
      ctx.font = '900 26px "Oswald", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(stat.value, boxX + 25, boxY + 75);
    }

    // 8. Progress Motivation Quote Section
    const quoteY = 1360;

    // Quote Top Divider
    ctx.beginPath();
    ctx.moveTo(width / 2 - 80, quoteY);
    ctx.lineTo(width / 2 + 80, quoteY);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#d4af37';
    ctx.font = 'italic 900 28px "Oswald", sans-serif';
    ctx.fillText('“ FOCUS ON PROGRESS, ”', width / 2, quoteY + 45);
    ctx.fillText('“ NOT PERFECTION. ”', width / 2, quoteY + 85);

    // Quote Bottom Divider
    ctx.beginPath();
    ctx.moveTo(width / 2 - 80, quoteY + 130);
    ctx.lineTo(width / 2 + 80, quoteY + 130);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 9. Member Profile Info & Active Streak
    const profileY = 1590;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px "Oswald", sans-serif';
    ctx.fillText(memberName.toUpperCase(), width / 2, profileY);

    if (streak > 0) {
      const streakText = `🔥  ${streak}-DAY CONSISTENCY STREAK`;
      ctx.font = '900 36px "Oswald", sans-serif';
      const textWidth = ctx.measureText(streakText).width;

      const capWidth = textWidth + 80;
      const capHeight = 80;
      const capX = (width - capWidth) / 2;
      const capY = profileY + 40;
      const capR = 40;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(capX, capY, capWidth, capHeight, capR);
      } else {
        ctx.rect(capX, capY, capWidth, capHeight);
      }
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#f87171';
      ctx.fillText(streakText, width / 2, capY + capHeight / 2 + 2);
    } else {
      ctx.fillStyle = '#a0a0ab';
      ctx.font = 'bold 24px "Inter", sans-serif';
      ctx.fillText('CRUSHING GYM GOALS DAILY', width / 2, profileY + 80);
    }

    // 10. Branded Footer
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 24px "Inter", sans-serif';
    try {
      (ctx as any).letterSpacing = '1px';
    } catch (e) {}
    ctx.fillText('PROUD MEMBER OF EPICENTER FITNESS', width / 2, height - 150);
    try {
      (ctx as any).letterSpacing = '0px';
    } catch (e) {}

    ctx.fillStyle = '#d4af37';
    ctx.font = '900 28px "Oswald", sans-serif';
    try {
      (ctx as any).letterSpacing = '2px';
    } catch (e) {}
    ctx.fillText('EPICENTER FITNESS GYM', width / 2, height - 100);
    try {
      (ctx as any).letterSpacing = '0px';
    } catch (e) {}
  }
}
