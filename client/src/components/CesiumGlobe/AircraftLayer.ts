import * as Cesium from 'cesium';
import type { NormalizedAircraft } from '@shared/types';
import {
  getAircraftCategoryDetails,
  getAirlineLivery,
  type AircraftCategory,
  type AirlineLivery,
} from '../../utils/aircraftClassification';

interface AircraftBillboard extends Cesium.Billboard {
  _currentTextureKey?: string;
}

interface AircraftLabel extends Cesium.Label {
  _isCurrentlySelected?: boolean;
}

// Pre-rendered cached canvas textures for 60 FPS performance
const textureCache: Record<string, string> = {};

const OUTLINE_COLOR = '#334155';

/**
 * Draws tactical surveillance targeting reticle when selected
 */
function drawReticle(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.save();
  // Soft outer surveillance halo
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(91, 140, 180, 0.15)';
  ctx.fill();

  // Sharp steel-blue reticle ring
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.44, 0, Math.PI * 2);
  ctx.strokeStyle = '#5b8cb4';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Crosshairs with center gap
  const gap = 16;
  ctx.beginPath();
  ctx.moveTo(cx, 8); ctx.lineTo(cx, cy - gap);
  ctx.moveTo(cx, size - 8); ctx.lineTo(cx, cy + gap);
  ctx.moveTo(8, cy); ctx.lineTo(cx - gap, cy);
  ctx.moveTo(size - 8, cy); ctx.lineTo(cx + gap, cy);
  ctx.strokeStyle = '#5b8cb4';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 4 Corner brackets
  const bLen = 10;
  const bDist = size * 0.42;
  ctx.beginPath();
  // Top-Left
  ctx.moveTo(cx - bDist, cy - bDist + bLen);
  ctx.lineTo(cx - bDist, cy - bDist);
  ctx.lineTo(cx - bDist + bLen, cy - bDist);
  // Top-Right
  ctx.moveTo(cx + bDist - bLen, cy - bDist);
  ctx.lineTo(cx + bDist, cy - bDist);
  ctx.lineTo(cx + bDist, cy - bDist + bLen);
  // Bottom-Left
  ctx.moveTo(cx - bDist, cy + bDist - bLen);
  ctx.lineTo(cx - bDist, cy + bDist);
  ctx.lineTo(cx - bDist + bLen, cy + bDist);
  // Bottom-Right
  ctx.moveTo(cx + bDist - bLen, cy + bDist);
  ctx.lineTo(cx + bDist, cy + bDist);
  ctx.lineTo(cx + bDist, cy + bDist - bLen);
  ctx.strokeStyle = 'rgba(91, 140, 180, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

/**
 * Standard Jet Engine Nacelle Pod
 */
function drawJetEngine(ctx: CanvasRenderingContext2D, engX: number, engY = 2, radius = 4.0, length = 8.5) {
  // Engine Pylon
  ctx.beginPath();
  ctx.rect(engX - 1, engY - length * 0.8, 2, length * 0.9);
  ctx.fillStyle = '#64748b';
  ctx.fill();

  // Engine Nacelle Cowling
  ctx.beginPath();
  ctx.ellipse(engX, engY, radius, length, 0, 0, Math.PI * 2);
  const engGrad = ctx.createLinearGradient(engX - radius, engY, engX + radius, engY);
  engGrad.addColorStop(0, '#cbd5e1');
  engGrad.addColorStop(0.4, '#ffffff');
  engGrad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = engGrad;
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Intake Rim & Dark Fan Face
  ctx.beginPath();
  ctx.ellipse(engX, engY - length * 0.75, radius * 0.8, 1.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Titanium Spinner Cone
  ctx.beginPath();
  ctx.arc(engX, engY - length * 0.75, 0.9, 0, Math.PI * 2);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();

  // Exhaust Nozzle
  ctx.beginPath();
  ctx.ellipse(engX, engY + length * 0.85, radius * 0.6, 1.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#334155';
  ctx.fill();
}

/**
 * Common Navigation Lights (Port Red, Starboard Green, Tail Strobe)
 */
function drawNavLights(ctx: CanvasRenderingContext2D, leftX: number, rightX: number, wingY: number, tailY = 51.5) {
  // Left Wingtip (Port Red)
  ctx.beginPath();
  ctx.arc(leftX, wingY, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = '#ef4444';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 5;
  ctx.fill();

  // Right Wingtip (Starboard Green)
  ctx.beginPath();
  ctx.arc(rightX, wingY, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = '#10b981';
  ctx.shadowColor = '#10b981';
  ctx.shadowBlur = 5;
  ctx.fill();

  // Tail Strobe (White Beacon)
  ctx.beginPath();
  ctx.arc(0, tailY, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 5;
  ctx.fill();
  ctx.shadowBlur = 0; // reset
}

/**
 * 1. Super Heavy Archetype: A380 / B747 (4 Turbofans, Swept Delta Wings, Double-Deck/Hump)
 */
function drawSuperHeavy(ctx: CanvasRenderingContext2D, livery: AirlineLivery) {
  // Horizontal Stabilizers
  ctx.beginPath();
  ctx.moveTo(0, 36);
  ctx.lineTo(28, 48);
  ctx.lineTo(26, 52);
  ctx.lineTo(0, 48);
  ctx.lineTo(-26, 52);
  ctx.lineTo(-28, 48);
  ctx.closePath();
  ctx.fillStyle = '#cbd5e1';
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Swept Delta Wings (Broad 58-unit span)
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.bezierCurveTo(6, -18, 12, -14, 14, -8);
  ctx.lineTo(58, 15);
  ctx.lineTo(56, 21);
  ctx.lineTo(14, 9);
  ctx.bezierCurveTo(8, 12, 4, 14, 0, 14);
  ctx.bezierCurveTo(-4, 14, -8, 12, -14, 9);
  ctx.lineTo(-56, 21);
  ctx.lineTo(-58, 15);
  ctx.bezierCurveTo(-12, -14, -6, -18, 0, -18);
  ctx.closePath();
  const wingGrad = ctx.createLinearGradient(-58, 0, 58, 0);
  wingGrad.addColorStop(0, '#e2e8f0');
  wingGrad.addColorStop(0.5, '#ffffff');
  wingGrad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = wingGrad;
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Livery Wing Accent Stripes
  ctx.beginPath();
  ctx.moveTo(42, 6); ctx.lineTo(50, 11); ctx.lineTo(48, 15); ctx.lineTo(40, 10);
  ctx.moveTo(-42, 6); ctx.lineTo(-50, 11); ctx.lineTo(-48, 15); ctx.lineTo(-40, 10);
  ctx.closePath();
  ctx.fillStyle = livery.accentColor;
  ctx.fill();

  // 4 Turbofan Engines (2 under each wing)
  drawJetEngine(ctx, 20, 2, 4.2, 8.5);  // Right Inboard
  drawJetEngine(ctx, 36, 7, 3.8, 7.8);  // Right Outboard
  drawJetEngine(ctx, -20, 2, 4.2, 8.5); // Left Inboard
  drawJetEngine(ctx, -36, 7, 3.8, 7.8); // Left Outboard

  // Massive Fuselage (Radius 7.4, Double-deck bulge)
  ctx.beginPath();
  ctx.moveTo(0, -50);
  ctx.bezierCurveTo(5.5, -50, 7.4, -36, 7.4, -15);
  ctx.lineTo(7.4, 25);
  ctx.bezierCurveTo(7.4, 40, 3.2, 50, 0, 53);
  ctx.bezierCurveTo(-3.2, 50, -7.4, 40, -7.4, 25);
  ctx.lineTo(-7.4, -15);
  ctx.bezierCurveTo(-7.4, -36, -5.5, -50, 0, -50);
  ctx.closePath();
  const fuseGrad = ctx.createLinearGradient(-7.4, 0, 7.4, 0);
  fuseGrad.addColorStop(0, '#cbd5e1');
  fuseGrad.addColorStop(0.2, '#f1f5f9');
  fuseGrad.addColorStop(0.5, '#ffffff');
  fuseGrad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = fuseGrad;
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Cockpit Visor
  ctx.beginPath();
  ctx.arc(0, -42, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  // Tail Fin in Authentic Airline Livery
  ctx.beginPath();
  ctx.moveTo(0, 24);
  ctx.bezierCurveTo(2.0, 30, 2.4, 42, 1.2, 52);
  ctx.lineTo(-1.2, 52);
  ctx.bezierCurveTo(-2.4, 42, -2.0, 30, 0, 24);
  ctx.closePath();
  ctx.fillStyle = livery.tailColor;
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  drawNavLights(ctx, -57, 57, 18, 52.5);
}

/**
 * 2. Widebody Heavy Archetype: B777 / B787 / A350 / A330 (2 Large High-Bypass Engines, Raked Wings)
 */
function drawWidebody(ctx: CanvasRenderingContext2D, livery: AirlineLivery) {
  // Horizontal Stabilizers
  ctx.beginPath();
  ctx.moveTo(0, 36);
  ctx.lineTo(26, 47);
  ctx.lineTo(24, 51);
  ctx.lineTo(0, 48);
  ctx.lineTo(-24, 51);
  ctx.lineTo(-26, 47);
  ctx.closePath();
  ctx.fillStyle = '#cbd5e1';
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Swept Wings with Raked Wingtips (Span 52)
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.bezierCurveTo(4, -15, 8, -12, 10, -7);
  ctx.lineTo(52, 14);
  ctx.lineTo(50, 19);
  ctx.lineTo(10, 8);
  ctx.bezierCurveTo(7, 10, 4, 12, 0, 12);
  ctx.bezierCurveTo(-4, 12, -7, 10, -10, 8);
  ctx.lineTo(-50, 19);
  ctx.lineTo(-52, 14);
  ctx.bezierCurveTo(-8, -12, -4, -15, 0, -15);
  ctx.closePath();
  const wingGrad = ctx.createLinearGradient(-52, 0, 52, 0);
  wingGrad.addColorStop(0, '#e2e8f0');
  wingGrad.addColorStop(0.5, '#ffffff');
  wingGrad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = wingGrad;
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Livery Wing Stripes
  ctx.beginPath();
  ctx.moveTo(36, 7); ctx.lineTo(44, 11); ctx.lineTo(42, 15); ctx.lineTo(34, 11);
  ctx.moveTo(-36, 7); ctx.lineTo(-44, 11); ctx.lineTo(-42, 15); ctx.lineTo(-34, 11);
  ctx.closePath();
  ctx.fillStyle = livery.accentColor;
  ctx.fill();

  // 2 Large Turbofan Engines (e.g. GE90 / Trent XWB)
  drawJetEngine(ctx, 19, 2, 4.6, 9.2);
  drawJetEngine(ctx, -19, 2, 4.6, 9.2);

  // Wide Fuselage (Radius 6.4)
  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.bezierCurveTo(4.8, -48, 6.4, -36, 6.4, -15);
  ctx.lineTo(6.4, 24);
  ctx.bezierCurveTo(6.4, 38, 2.8, 48, 0, 52);
  ctx.bezierCurveTo(-2.8, 48, -6.4, 38, -6.4, 24);
  ctx.lineTo(-6.4, -15);
  ctx.bezierCurveTo(-6.4, -36, -4.8, -48, 0, -48);
  ctx.closePath();
  const fuseGrad = ctx.createLinearGradient(-6.4, 0, 6.4, 0);
  fuseGrad.addColorStop(0, '#cbd5e1');
  fuseGrad.addColorStop(0.2, '#f1f5f9');
  fuseGrad.addColorStop(0.5, '#ffffff');
  fuseGrad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = fuseGrad;
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Cockpit Visor
  ctx.beginPath();
  ctx.arc(0, -40, 2.8, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  // Tail Fin in Airline Livery
  ctx.beginPath();
  ctx.moveTo(0, 26);
  ctx.bezierCurveTo(1.6, 30, 2.0, 41, 1.0, 51);
  ctx.lineTo(-1.0, 51);
  ctx.bezierCurveTo(-2.0, 41, -1.6, 30, 0, 26);
  ctx.closePath();
  ctx.fillStyle = livery.tailColor;
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  drawNavLights(ctx, -51, 51, 16, 51.5);
}

/**
 * 3. Commercial Narrowbody Archetype: A320 / B737 (2 Engines, Winglets, Single-Aisle)
 */
function drawNarrowbody(ctx: CanvasRenderingContext2D, livery: AirlineLivery) {
  // Horizontal Stabilizers
  ctx.beginPath();
  ctx.moveTo(0, 36);
  ctx.lineTo(24, 46);
  ctx.lineTo(22, 50);
  ctx.lineTo(0, 47);
  ctx.lineTo(-22, 50);
  ctx.lineTo(-24, 46);
  ctx.closePath();
  ctx.fillStyle = '#cbd5e1';
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Swept Wings with Sharklets/Winglets (Span 46)
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.bezierCurveTo(4, -14, 7, -11, 8, -6);
  ctx.lineTo(46, 14);
  ctx.lineTo(44, 18);
  ctx.lineTo(8, 7);
  ctx.bezierCurveTo(6, 9, 3, 11, 0, 11);
  ctx.bezierCurveTo(-3, 11, -6, 9, -8, 7);
  ctx.lineTo(-44, 18);
  ctx.lineTo(-46, 14);
  ctx.bezierCurveTo(-7, -11, -4, -14, 0, -14);
  ctx.closePath();
  const wingGrad = ctx.createLinearGradient(-46, 0, 46, 0);
  wingGrad.addColorStop(0, '#e2e8f0');
  wingGrad.addColorStop(0.5, '#ffffff');
  wingGrad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = wingGrad;
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // Winglet Livery Accent
  ctx.beginPath();
  ctx.moveTo(43, 11); ctx.lineTo(46, 14); ctx.lineTo(44, 18); ctx.lineTo(41, 15);
  ctx.moveTo(-43, 11); ctx.lineTo(-46, 14); ctx.lineTo(-44, 18); ctx.lineTo(-41, 15);
  ctx.closePath();
  ctx.fillStyle = livery.accentColor;
  ctx.fill();

  // 2 Engines under wings
  drawJetEngine(ctx, 16, 2, 3.8, 8.0);
  drawJetEngine(ctx, -16, 2, 3.8, 8.0);

  // Single-Aisle Fuselage (Radius 5.2)
  ctx.beginPath();
  ctx.moveTo(0, -47);
  ctx.bezierCurveTo(3.8, -47, 5.2, -35, 5.2, -14);
  ctx.lineTo(5.2, 23);
  ctx.bezierCurveTo(5.2, 37, 2.4, 47, 0, 51);
  ctx.bezierCurveTo(-2.4, 47, -5.2, 37, -5.2, 23);
  ctx.lineTo(-5.2, -14);
  ctx.bezierCurveTo(-5.2, -35, -3.8, -47, 0, -47);
  ctx.closePath();
  const fuseGrad = ctx.createLinearGradient(-5.2, 0, 5.2, 0);
  fuseGrad.addColorStop(0, '#cbd5e1');
  fuseGrad.addColorStop(0.2, '#f1f5f9');
  fuseGrad.addColorStop(0.5, '#ffffff');
  fuseGrad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = fuseGrad;
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // Cockpit Visor
  ctx.beginPath();
  ctx.arc(0, -39, 2.4, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  // Tail Fin in Airline Livery
  ctx.beginPath();
  ctx.moveTo(0, 26);
  ctx.bezierCurveTo(1.4, 30, 1.8, 40, 0.9, 50);
  ctx.lineTo(-0.9, 50);
  ctx.bezierCurveTo(-1.8, 40, -1.4, 30, 0, 26);
  ctx.closePath();
  ctx.fillStyle = livery.tailColor;
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  drawNavLights(ctx, -45, 45, 16, 50.5);
}

/**
 * 4. Regional Jet & BizJet Archetype: CRJ / ERJ / Gulfstream / Citation (Rear Fuselage Engines + T-Tail)
 */
function drawRegionalTtail(ctx: CanvasRenderingContext2D, livery: AirlineLivery) {
  // Clean Swept Wings WITHOUT underwing engines (Span 38)
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(38, 14);
  ctx.lineTo(36, 18);
  ctx.lineTo(0, 10);
  ctx.lineTo(-36, 18);
  ctx.lineTo(-38, 14);
  ctx.closePath();
  const wingGrad = ctx.createLinearGradient(-38, 0, 38, 0);
  wingGrad.addColorStop(0, '#e2e8f0');
  wingGrad.addColorStop(0.5, '#ffffff');
  wingGrad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = wingGrad;
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Wingtip Accents
  ctx.beginPath();
  ctx.moveTo(35, 12); ctx.lineTo(38, 14); ctx.lineTo(36, 18); ctx.lineTo(33, 16);
  ctx.moveTo(-35, 12); ctx.lineTo(-38, 14); ctx.lineTo(-36, 18); ctx.lineTo(-33, 16);
  ctx.closePath();
  ctx.fillStyle = livery.accentColor;
  ctx.fill();

  // 2 Aft Fuselage-Mounted Engines (Distinctive BizJet/CRJ profile)
  drawJetEngine(ctx, 8.5, 20, 3.2, 7.5);
  drawJetEngine(ctx, -8.5, 20, 3.2, 7.5);

  // Slender Needle Fuselage (Radius 4.0)
  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.bezierCurveTo(2.8, -48, 4.0, -32, 4.0, -10);
  ctx.lineTo(4.0, 26);
  ctx.bezierCurveTo(4.0, 38, 2.0, 46, 0, 50);
  ctx.bezierCurveTo(-2.0, 46, -4.0, 38, -4.0, 26);
  ctx.lineTo(-4.0, -10);
  ctx.bezierCurveTo(-4.0, -32, -2.8, -48, 0, -48);
  ctx.closePath();
  const fuseGrad = ctx.createLinearGradient(-4.0, 0, 4.0, 0);
  fuseGrad.addColorStop(0, '#cbd5e1');
  fuseGrad.addColorStop(0.5, '#ffffff');
  fuseGrad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = fuseGrad;
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Sharp Cockpit Visor
  ctx.beginPath();
  ctx.arc(0, -40, 2.0, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  // High T-Tail Stabilizer on top of fin
  ctx.beginPath();
  ctx.moveTo(0, 43);
  ctx.lineTo(20, 47);
  ctx.lineTo(19, 50);
  ctx.lineTo(0, 48);
  ctx.lineTo(-19, 50);
  ctx.lineTo(-20, 47);
  ctx.closePath();
  ctx.fillStyle = livery.tailColor;
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 0.9;
  ctx.stroke();

  drawNavLights(ctx, -37, 37, 16, 49.5);
}

/**
 * 5. Twin Turboprop Commuter Archetype: ATR-72 / Dash 8 (High Straight Wings, Propeller Discs)
 */
function drawTurboprop(ctx: CanvasRenderingContext2D, livery: AirlineLivery) {
  // High Straight Wings (Span 44)
  ctx.beginPath();
  ctx.moveTo(-44, -5);
  ctx.lineTo(44, -5);
  ctx.lineTo(42, 3);
  ctx.lineTo(-42, 3);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 1.0;
  ctx.stroke();
  ctx.fill();

  // 2 Turboprop Nacelles with Spinning Propeller Discs
  const drawPropNacelle = (px: number) => {
    // Engine Nacelle
    ctx.beginPath();
    ctx.rect(px - 3, -11, 6, 16);
    ctx.fillStyle = '#cbd5e1';
    ctx.fill();
    ctx.strokeStyle = OUTLINE_COLOR;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Propeller Disc (Translucent Spinning Arc)
    ctx.beginPath();
    ctx.ellipse(px, -11, 8.5, 2.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(91, 140, 180, 0.35)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(91, 140, 180, 0.7)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Spinner Cone
    ctx.beginPath();
    ctx.arc(px, -12, 1.4, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
  };

  drawPropNacelle(16);
  drawPropNacelle(-16);

  // Fuselage (Commuter tube)
  ctx.beginPath();
  ctx.moveTo(0, -44);
  ctx.bezierCurveTo(3.4, -44, 4.4, -30, 4.4, -5);
  ctx.lineTo(4.4, 25);
  ctx.bezierCurveTo(4.4, 38, 2.0, 46, 0, 49);
  ctx.bezierCurveTo(-2.0, 46, -4.4, 38, -4.4, 25);
  ctx.lineTo(-4.4, -5);
  ctx.bezierCurveTo(-4.4, -30, -3.4, -44, 0, -44);
  ctx.closePath();
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Tail Fin
  ctx.beginPath();
  ctx.moveTo(0, 26);
  ctx.lineTo(1.2, 48);
  ctx.lineTo(-1.2, 48);
  ctx.closePath();
  ctx.fillStyle = livery.tailColor;
  ctx.fill();

  // High T-Tail
  ctx.beginPath();
  ctx.moveTo(-16, 44); ctx.lineTo(16, 44); ctx.lineTo(15, 47); ctx.lineTo(-15, 47);
  ctx.closePath();
  ctx.fillStyle = livery.tailColor;
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  drawNavLights(ctx, -43, 43, -1, 48.5);
}

/**
 * 6. Light GA Propeller Archetype: Cessna 172 / Piper / Cirrus (Single Tractor Nose Prop)
 */
function drawLightGA(ctx: CanvasRenderingContext2D, livery: AirlineLivery) {
  // Straight Rectangular Wings (Span 34)
  ctx.beginPath();
  ctx.rect(-34, -8, 68, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Wingtips Livery Accent
  ctx.beginPath();
  ctx.rect(30, -8, 4, 8);
  ctx.rect(-34, -8, 4, 8);
  ctx.fillStyle = livery.accentColor;
  ctx.fill();

  // Compact Cabin Fuselage
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.bezierCurveTo(2.8, -34, 3.8, -20, 3.8, -4);
  ctx.lineTo(3.8, 18);
  ctx.bezierCurveTo(3.8, 30, 1.8, 38, 0, 42);
  ctx.bezierCurveTo(-1.8, 38, -3.8, 30, -3.8, 18);
  ctx.lineTo(-3.8, -4);
  ctx.bezierCurveTo(-3.8, -20, -2.8, -34, 0, -34);
  ctx.closePath();
  ctx.fillStyle = '#f1f5f9';
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Single Nose Tractor Propeller
  ctx.beginPath();
  ctx.ellipse(0, -36, 11, 2.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(91, 140, 180, 0.4)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(91, 140, 180, 0.8)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Spinner Point
  ctx.beginPath();
  ctx.arc(0, -36.5, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  // Small Horizontal Stabilizer
  ctx.beginPath();
  ctx.rect(-12, 36, 24, 4);
  ctx.fillStyle = livery.tailColor;
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  drawNavLights(ctx, -33, 33, -4, 41.5);
}

/**
 * 7. Helicopter Archetype: Rotorcraft (Rotor Disc + Tail Boom)
 */
function drawHeli(ctx: CanvasRenderingContext2D, livery: AirlineLivery) {
  // Main Rotor Disc (Spinning 4-blade disc)
  ctx.beginPath();
  ctx.arc(0, -4, 34, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(91, 140, 180, 0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(91, 140, 180, 0.4)';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // 4 Rotor Blades
  ctx.beginPath();
  ctx.moveTo(0, -38); ctx.lineTo(0, 30);
  ctx.moveTo(-34, -4); ctx.lineTo(34, -4);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Teardrop Cockpit Fuselage
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.bezierCurveTo(5.2, -26, 6.2, -14, 6.2, 0);
  ctx.bezierCurveTo(6.2, 12, 3.2, 18, 0, 20);
  ctx.bezierCurveTo(-3.2, 18, -6.2, 12, -6.2, 0);
  ctx.bezierCurveTo(-6.2, -14, -5.2, -26, 0, -26);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Cockpit Glass Bubble
  ctx.beginPath();
  ctx.arc(0, -18, 4.0, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  // Rotor Hub
  ctx.beginPath();
  ctx.arc(0, -4, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = livery.tailColor;
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Tail Boom extending aft
  ctx.beginPath();
  ctx.moveTo(-1.2, 18);
  ctx.lineTo(-0.8, 44);
  ctx.lineTo(0.8, 44);
  ctx.lineTo(1.2, 18);
  ctx.closePath();
  ctx.fillStyle = livery.tailColor;
  ctx.fill();
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Tail Rotor
  ctx.beginPath();
  ctx.ellipse(3, 44, 2.0, 6.0, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(91, 140, 180, 0.5)';
  ctx.fill();
  ctx.strokeStyle = '#5b8cb4';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Red/Green navigation points on skids
  drawNavLights(ctx, -7, 7, 0, 44);
}

/**
 * Renders and caches an aircraft texture based on its archetype, authentic livery, and selection state
 */
function getAircraftTexture(
  category: AircraftCategory,
  livery: AirlineLivery,
  isSelected: boolean
): string {
  const key = `${category}_${livery.tailColor}_${livery.accentColor}_${isSelected ? '1' : '0'}`;
  if (textureCache[key]) return textureCache[key];

  const size = isSelected ? 160 : 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const cx = size / 2;
  const cy = size / 2;

  // 1. Tactical Reticle (when selected)
  if (isSelected) {
    drawReticle(ctx, cx, cy, size);
  }

  // 2. Draw Type-Specific Aircraft Morphology
  ctx.save();
  ctx.translate(cx, cy);
  const s = size / 120;
  ctx.scale(s, s);

  switch (category) {
    case 'super':
      drawSuperHeavy(ctx, livery);
      break;
    case 'heavy':
      drawWidebody(ctx, livery);
      break;
    case 'regional':
      drawRegionalTtail(ctx, livery);
      break;
    case 'turboprop':
      drawTurboprop(ctx, livery);
      break;
    case 'light':
      drawLightGA(ctx, livery);
      break;
    case 'heli':
      drawHeli(ctx, livery);
      break;
    case 'narrow':
    default:
      drawNarrowbody(ctx, livery);
      break;
  }

  ctx.restore();

  const dataUrl = canvas.toDataURL();
  textureCache[key] = dataUrl;
  return dataUrl;
}

export class AircraftLayer {
  public viewer: Cesium.Viewer;
  public billboardCollection: Cesium.BillboardCollection;
  public labelCollection: Cesium.LabelCollection;
  private billboards: Map<string, AircraftBillboard> = new Map();
  private labels: Map<string, Cesium.Label> = new Map();
  private eventHandler: Cesium.ScreenSpaceEventHandler | null = null;
  private onSelectAircraft: (id: string | null) => void;
  public selectedId: string | null = null;
  private occluder: Cesium.EllipsoidalOccluder;

  constructor(viewer: Cesium.Viewer, onSelectAircraft: (id: string | null) => void) {
    this.viewer = viewer;
    this.onSelectAircraft = onSelectAircraft;
    this.occluder = new Cesium.EllipsoidalOccluder(
      viewer.scene.globe.ellipsoid,
      viewer.camera.positionWC
    );

    // Hardware-instanced BillboardCollection
    this.billboardCollection = new Cesium.BillboardCollection({
      scene: viewer.scene,
    });
    viewer.scene.primitives.add(this.billboardCollection);

    // Hardware-instanced LabelCollection for callsigns
    this.labelCollection = new Cesium.LabelCollection({
      scene: viewer.scene,
    });
    viewer.scene.primitives.add(this.labelCollection);

    this.setupPicking();
  }

  private setupPicking() {
    this.eventHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);

    this.eventHandler.setInputAction((movement: { position: Cesium.Cartesian2 }) => {
      const pickedObject = this.viewer.scene.pick(movement.position);

      if (Cesium.defined(pickedObject) && pickedObject.id) {
        const id = typeof pickedObject.id === 'string' ? pickedObject.id : pickedObject.id?.id;
        if (id && this.billboards.has(id)) {
          this.onSelectAircraft(id);
          return;
        }
      }

      // Ray-cast against billboards within a 24px fuzzy touch radius
      const pickRay = this.viewer.camera.getPickRay(movement.position);
      if (pickRay) {
        let closestId: string | null = null;
        let closestDist = 24.0;

        for (const [id, bb] of this.billboards.entries()) {
          if (!bb.show) continue;
          const winPos = Cesium.SceneTransforms.worldToWindowCoordinates(
            this.viewer.scene,
            bb.position
          );
          if (winPos) {
            const dist = Cesium.Cartesian2.distance(winPos, movement.position);
            if (dist < closestDist) {
              closestDist = dist;
              closestId = id;
            }
          }
        }

        if (closestId) {
          this.onSelectAircraft(closestId);
          return;
        }
      }

      this.onSelectAircraft(null);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  /**
   * Batch updates all aircraft billboards & callsign labels at 60 FPS
   */
  public update(aircraftList: NormalizedAircraft[], selectedId: string | null) {
    if (!this.viewer || this.viewer.isDestroyed()) return;
    this.selectedId = selectedId;
    this.occluder.cameraPosition = this.viewer.camera.positionWC;
    const activeIds = new Set<string>();

    for (const ac of aircraftList) {
      activeIds.add(ac.id);
      const isSelected = ac.id === selectedId;

      // Extract real aircraft archetype details and authentic airline livery
      const categoryDetails = getAircraftCategoryDetails(ac.aircraftType);
      const livery = getAirlineLivery(ac.callsign, ac.operator);
      const textureKey = `${categoryDetails.category}_${livery.tailColor}_${livery.accentColor}_${isSelected ? '1' : '0'}`;
      const textureUrl = getAircraftTexture(categoryDetails.category, livery, isSelected);
      const targetScale = isSelected ? categoryDetails.selectedScale : categoryDetails.baseScale;

      // Convert coordinates (lon, lat, altMeters) to Cesium Cartesian3
      const position = Cesium.Cartesian3.fromDegrees(
        ac.position.longitude,
        ac.position.latitude,
        ac.position.altitudeMeters
      );

      // Horizon Occlusion Culling
      const isVisible = this.occluder.isPointVisible(position);

      // Surface-locked heading
      let finalRotation = -Cesium.Math.toRadians(ac.movement.heading);
      if (isVisible) {
        const posNorth = Cesium.Cartesian3.fromDegrees(
          ac.position.longitude,
          ac.position.latitude + 0.05,
          ac.position.altitudeMeters
        );
        const screenPos = Cesium.SceneTransforms.worldToWindowCoordinates(this.viewer.scene, position);
        const screenPosNorth = Cesium.SceneTransforms.worldToWindowCoordinates(this.viewer.scene, posNorth);

        if (screenPos && screenPosNorth) {
          const dx = screenPosNorth.x - screenPos.x;
          const dy = screenPosNorth.y - screenPos.y;
          const northAngleRad = Math.atan2(dx, -dy);
          finalRotation = -(northAngleRad + Cesium.Math.toRadians(ac.movement.heading));
        }
      }

      // --- 1. Type-Accurate Airplane Billboard Marker ---
      let billboard = this.billboards.get(ac.id);

      if (!billboard) {
        billboard = this.billboardCollection.add({
          position,
          image: textureUrl,
          rotation: finalRotation,
          alignedAxis: Cesium.Cartesian3.ZERO,
          scale: targetScale,
          id: ac.id,
          show: isVisible,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          heightReference: Cesium.HeightReference.NONE,
          scaleByDistance: new Cesium.NearFarScalar(1.0e3, 1.15, 2.0e7, 0.85),
        }) as AircraftBillboard;
        billboard._currentTextureKey = textureKey;
        this.billboards.set(ac.id, billboard);
      } else {
        billboard.show = isVisible;
        billboard.position = position;
        billboard.rotation = finalRotation;

        // ONLY update texture and scale when selection or type actually changes
        if (billboard._currentTextureKey !== textureKey) {
          billboard.image = textureUrl;
          billboard.scale = targetScale;
          billboard._currentTextureKey = textureKey;
        }
      }

      // --- 2. High-Legibility Callsign Radar Label ---
      let label = this.labels.get(ac.id) as AircraftLabel | undefined;
      const labelText = ac.callsign || ac.id.toUpperCase();

      const labelOffset = isSelected
        ? new Cesium.Cartesian2(0, 52)
        : new Cesium.Cartesian2(0, 36);

      const displayCondition = isSelected
        ? new Cesium.DistanceDisplayCondition(0, Number.MAX_VALUE)
        : new Cesium.DistanceDisplayCondition(0, 2200000);

      const labelFont = isSelected
        ? '700 24px "JetBrains Mono", monospace'
        : '600 22px "JetBrains Mono", monospace';

      const labelFillColor = isSelected
        ? Cesium.Color.fromCssColorString('#d8dfe8')
        : Cesium.Color.fromCssColorString('#8893a4');

      const labelBgColor = isSelected
        ? Cesium.Color.fromCssColorString('rgba(17, 21, 29, 0.95)')
        : Cesium.Color.fromCssColorString('rgba(12, 15, 20, 0.85)');

      const labelPadding = isSelected
        ? new Cesium.Cartesian2(14, 8)
        : new Cesium.Cartesian2(12, 6);

      if (!label) {
        label = this.labelCollection.add({
          position,
          text: labelText,
          font: labelFont,
          scale: 0.5,
          fillColor: labelFillColor,
          style: Cesium.LabelStyle.FILL,
          pixelOffset: labelOffset,
          eyeOffset: new Cesium.Cartesian3(0, 0, -10),
          show: isVisible,
          showBackground: true,
          backgroundColor: labelBgColor,
          backgroundPadding: labelPadding,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: displayCondition,
          id: ac.id,
        }) as AircraftLabel;
        label._isCurrentlySelected = isSelected;
        this.labels.set(ac.id, label);
      } else {
        label.show = isVisible;
        label.position = position;
        if (label.text !== labelText) label.text = labelText;

        if (label._isCurrentlySelected !== isSelected) {
          label.font = labelFont;
          label.scale = 0.5;
          label.fillColor = labelFillColor;
          label.style = Cesium.LabelStyle.FILL;
          label.backgroundColor = labelBgColor;
          label.backgroundPadding = labelPadding;
          label.pixelOffset = labelOffset;
          label.distanceDisplayCondition = displayCondition;
          label._isCurrentlySelected = isSelected;
        }
      }
    }

    // Remove any stale aircraft
    for (const [id, bb] of this.billboards.entries()) {
      if (!activeIds.has(id)) {
        this.billboardCollection.remove(bb);
        this.billboards.delete(id);
      }
    }

    for (const [id, lbl] of this.labels.entries()) {
      if (!activeIds.has(id)) {
        this.labelCollection.remove(lbl);
        this.labels.delete(id);
      }
    }
  }

  public destroy() {
    if (this.eventHandler) {
      this.eventHandler.destroy();
      this.eventHandler = null;
    }
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.primitives.remove(this.billboardCollection);
      this.viewer.scene.primitives.remove(this.labelCollection);
    }
    this.billboards.clear();
    this.labels.clear();
  }
}
