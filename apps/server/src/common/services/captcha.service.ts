import { randomBytes, randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { RuntimeCacheService } from './runtime-cache.service';

interface CaptchaPuzzle {
  expression: string;
  answer: number;
}

const CAPTCHA_TTL_MS = 5 * 60 * 1000; // 5 分钟
const CAPTCHA_WIDTH = 160;
const CAPTCHA_HEIGHT = 60;

@Injectable()
export class CaptchaService {
  private static readonly COLORS = {
    backgrounds: ['#F5F7FA', '#FDF6F0', '#F0F7F4', '#FAFAF5', '#F5F0F7'],
    texts: ['#2C3E50', '#34495E', '#3D4F5F', '#4A5568', '#2D3748'],
    operators: ['#E67E22', '#D35400', '#C0392B', '#8E44AD', '#2980B9'],
    noise: ['#CBD5E0', '#E2E8F0', '#D1D5DB', '#D4D4D8'],
  };

  public constructor(private readonly runtimeCacheService: RuntimeCacheService) {}

  /** 生成图形验证码，返回 captchaId 和 SVG 字符串 */
  public generate(): { captchaId: string; svg: string } {
    const captchaId = randomBytes(16).toString('hex');
    const puzzle = this.generatePuzzle();
    const svg = this.renderSvg(puzzle);

    // 存储答案，TTL 5 分钟
    this.runtimeCacheService.set(
      `captcha:${captchaId}`,
      { answer: puzzle.answer },
      CAPTCHA_TTL_MS,
    );

    return { captchaId, svg };
  }

  /** 校验验证码答案，通过后立即删除（一次性使用） */
  public validate(captchaId: string, userAnswer: string): boolean {
    const key = `captcha:${captchaId}`;
    const cached = this.runtimeCacheService.get<{ answer: number }>(key);

    if (!cached) {
      return false;
    }

    // 立即删除，防止重复使用
    this.runtimeCacheService.delete(key);

    const parsedAnswer = Number.parseInt(userAnswer.trim(), 10);
    if (!Number.isFinite(parsedAnswer)) {
      return false;
    }

    return parsedAnswer === cached.answer;
  }

  /** 生成 0-9 的加减法（确保结果 ≥ 0） */
  private generatePuzzle(): CaptchaPuzzle {
    const useAddition = randomInt(0, 2) === 0;
    const a = randomInt(0, 10);
    const b = randomInt(0, 10);

    if (useAddition) {
      return {
        expression: `${a} + ${b} = ?`,
        answer: a + b,
      };
    }

    // 减法：确保被减数 ≥ 减数
    const minuend = Math.max(a, b);
    const subtrahend = Math.min(a, b);
    return {
      expression: `${minuend} - ${subtrahend} = ?`,
      answer: minuend - subtrahend,
    };
  }

  /** 将数学题渲染为 SVG */
  private renderSvg(puzzle: CaptchaPuzzle): string {
    const bgColor = this.pick(CaptchaService.COLORS.backgrounds);
    const noiseLines = this.generateNoiseLines(3);
    const noiseDots = this.generateNoiseDots(12);
    const textElements = this.renderExpression(puzzle.expression);

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${CAPTCHA_WIDTH}" height="${CAPTCHA_HEIGHT}" viewBox="0 0 ${CAPTCHA_WIDTH} ${CAPTCHA_HEIGHT}">`,
      `<rect width="${CAPTCHA_WIDTH}" height="${CAPTCHA_HEIGHT}" fill="${bgColor}" rx="8"/>`,
      ...noiseLines,
      ...noiseDots,
      ...textElements,
      '</svg>',
    ].join('');
  }

  /** 将表达式拆分为单个字符并分别渲染（带随机偏移和旋转） */
  private renderExpression(expression: string): string[] {
    const parts: string[] = [];
    const chars = expression.split('');
    const startX = 18;
    const baseY = 42;

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i]!;
      const x = startX + i * 24 + randomInt(-3, 3);
      const y = baseY + randomInt(-4, 4);
      const rotate = randomInt(-8, 8);
      const fontSize = char === '?' ? 26 : randomInt(22, 28);

      const isOperator = ['+', '-', '='].includes(char);
      const color = isOperator
        ? this.pick(CaptchaService.COLORS.operators)
        : char === '?'
          ? '#9CA3AF'
          : this.pick(CaptchaService.COLORS.texts);

      parts.push(
        `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="Arial,Helvetica,sans-serif" font-weight="bold" fill="${color}" transform="rotate(${rotate}, ${x}, ${y})">${char}</text>`,
      );
    }

    return parts;
  }

  /** 生成干扰线 */
  private generateNoiseLines(count: number): string[] {
    const lines: string[] = [];

    for (let i = 0; i < count; i++) {
      const x1 = randomInt(5, 40);
      const y1 = randomInt(5, CAPTCHA_HEIGHT - 5);
      const x2 = randomInt(CAPTCHA_WIDTH - 40, CAPTCHA_WIDTH - 5);
      const y2 = randomInt(5, CAPTCHA_HEIGHT - 5);
      const color = this.pick(CaptchaService.COLORS.noise);
      const opacity = (randomInt(20, 50) / 100).toFixed(2);

      lines.push(
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="1"/>`,
      );
    }

    return lines;
  }

  /** 生成随机噪点 */
  private generateNoiseDots(count: number): string[] {
    const dots: string[] = [];

    for (let i = 0; i < count; i++) {
      const cx = randomInt(5, CAPTCHA_WIDTH - 5);
      const cy = randomInt(5, CAPTCHA_HEIGHT - 5);
      const r = (randomInt(5, 20) / 10).toFixed(1);
      const fill = this.pick(CaptchaService.COLORS.noise);
      const opacity = (randomInt(15, 40) / 100).toFixed(2);

      dots.push(
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="${opacity}"/>`,
      );
    }

    return dots;
  }

  private pick<T>(array: readonly T[]): T {
    return array[randomInt(0, array.length)]!;
  }
}
