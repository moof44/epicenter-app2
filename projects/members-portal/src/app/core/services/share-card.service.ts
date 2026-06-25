import { Injectable } from '@angular/core';

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
    ctx.fillText('EPICENTERGYM.PH', width / 2, height - 100);
    try {
      (ctx as any).letterSpacing = '0px';
    } catch (e) {}
  }
}
