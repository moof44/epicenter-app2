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
    badgeTitle: string,
    badgeIcon: string,
    badgeRequirement: string,
    streak: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
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

      // 2. Ensure fonts are loaded before drawing
      document.fonts.ready.then(() => {
        try {
          this.drawCard(ctx, width, height, memberName, badgeTitle, badgeIcon, badgeRequirement, streak);
          
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
      }).catch((err) => {
        reject(new Error('Font loading failed: ' + err.message));
      });
    });
  }

  /**
   * Draws the visual elements of the share card.
   */
  private drawCard(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    memberName: string,
    badgeTitle: string,
    badgeIcon: string,
    badgeRequirement: string,
    streak: number
  ) {
    // A. Dark Charcoal Background
    ctx.fillStyle = '#0a0a0b';
    ctx.fillRect(0, 0, width, height);

    // B. Outer Border (Sleek Gold Outline)
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#d4af37';
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // C. Radial Gradient Glow (Center-Backdrop)
    const glowX = width / 2;
    const glowY = height / 2 - 100;
    const innerRadius = 50;
    const outerRadius = 500;
    const gradient = ctx.createRadialGradient(glowX, glowY, innerRadius, glowX, glowY, outerRadius);
    gradient.addColorStop(0, 'rgba(212, 175, 55, 0.15)');
    gradient.addColorStop(1, 'rgba(10, 10, 11, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(48, 48, width - 96, height - 96);

    // D. Header - Epicenter Fitness Gym Logo
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Logo Circular Badge
    const logoX = width / 2;
    const logoY = 190;
    const logoR = 45;
    ctx.beginPath();
    ctx.arc(logoX, logoY, logoR, 0, 2 * Math.PI);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Initials in Logo
    ctx.fillStyle = '#d4af37';
    ctx.font = '900 36px "Oswald", sans-serif';
    ctx.fillText('EF', logoX, logoY + 2);

    // Logo Text underneath
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px "Oswald", sans-serif';
    try {
      (ctx as any).letterSpacing = '6px';
    } catch(e) {}
    ctx.fillText('EPICENTER PORTAL', width / 2, 285);
    try {
      (ctx as any).letterSpacing = '0px'; // reset
    } catch(e) {}

    ctx.fillStyle = '#a0a0ab';
    ctx.font = 'bold 20px "Inter", sans-serif';
    ctx.fillText('FITNESS • PERFORMANCE • COMMUNITY', width / 2, 330);

    // E. Central Badge Graphic (Big Glowing Showcase)
    const badgeX = width / 2;
    const badgeY = height / 2 - 150;
    const frameSize = 210;

    // Glowing shadow for the medal frame
    ctx.shadowColor = 'rgba(212, 175, 55, 0.4)';
    ctx.shadowBlur = 40;

    // Double Gold Frame rings
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, frameSize, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(15, 15, 17, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(badgeX, badgeY, frameSize - 15, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Reset shadow for text drawing
    ctx.shadowBlur = 0;

    // Draw Emoji icon (Large)
    ctx.font = '160px "Inter", "Apple Color Emoji", "Segoe UI Emoji"';
    ctx.fillText(badgeIcon, badgeX, badgeY + 10);

    // F. Achievement Titles
    ctx.fillStyle = '#a0a0ab';
    ctx.font = '900 32px "Oswald", sans-serif';
    try {
      (ctx as any).letterSpacing = '4px';
    } catch(e) {}
    ctx.fillText('ACHIEVEMENT UNLOCKED', width / 2, height / 2 + 150);
    try {
      (ctx as any).letterSpacing = '0px';
    } catch(e) {}

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 80px "Oswald", sans-serif';
    ctx.fillText(badgeTitle.toUpperCase(), width / 2, height / 2 + 230);

    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 26px "Inter", sans-serif';
    ctx.fillText(badgeRequirement, width / 2, height / 2 + 290);

    // G. Divider
    ctx.beginPath();
    ctx.moveTo(width / 2 - 150, height / 2 + 350);
    ctx.lineTo(width / 2 + 150, height / 2 + 350);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // H. Member Name & Streak flex
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 56px "Oswald", sans-serif';
    ctx.fillText(memberName.toUpperCase(), width / 2, height / 2 + 430);

    // Active Streak Fire Label
    if (streak > 0) {
      const streakText = `🔥  ${streak}-DAY STREAK`;
      ctx.font = '900 38px "Oswald", sans-serif';
      const textWidth = ctx.measureText(streakText).width;

      // Draw Streak Capsule Background
      const capWidth = textWidth + 80;
      const capHeight = 80;
      const capX = (width - capWidth) / 2;
      const capY = height / 2 + 490;
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
      ctx.fillText('CRUSHING GYM GOALS DAILY', width / 2, height / 2 + 530);
    }

    // I. Branded Footer
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 24px "Inter", sans-serif';
    try {
      (ctx as any).letterSpacing = '1px';
    } catch(e) {}
    ctx.fillText('PROUD MEMBER OF EPICENTER FITNESS', width / 2, height - 150);
    try {
      (ctx as any).letterSpacing = '0px';
    } catch(e) {}

    ctx.fillStyle = '#d4af37';
    ctx.font = '900 28px "Oswald", sans-serif';
    try {
      (ctx as any).letterSpacing = '2px';
    } catch(e) {}
    ctx.fillText('EPICENTERGYM.PH', width / 2, height - 100);
    try {
      (ctx as any).letterSpacing = '0px';
    } catch(e) {}
  }
}
