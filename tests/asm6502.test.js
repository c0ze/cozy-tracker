import test from 'node:test';
import assert from 'node:assert/strict';
import { assemble } from '../tools/asm6502.js';

const hex = (src, opts) => Buffer.from(assemble(src, opts).bytes).toString('hex');

test('encodes each addressing mode', () => {
  assert.equal(hex(`.org $1000
    lda #$01
    lda $fb
    lda $fb,x
    lda $d400
    sta $d400,x
    lda $1234,y
    lda ($fb),y
    lda ($fb,x)
    ldx $10,y
    jmp ($fffe)
    asl
    asl a
    rts`), 'a901a5fbb5fbad00d49d00d4b93412b1fba1fbb6106cfeff0a0a60');
});

test('chooses zero page only for values known on the first pass', () => {
  assert.equal(hex(`.org $1000
zp = $fb
    lda zp
    lda later
later = $fc`), 'a5fbadfc00');
});

test('resolves labels, local labels and branches both ways', () => {
  const { bytes, symbols } = assemble(`.org $c000
start: ldx #3
@loop: dex
    bne @loop
    beq done
    nop
done: rts
other: bne @loop
@loop: rts`);
  assert.equal(Buffer.from(bytes).toString('hex'), 'a203cad0fdf001ea60d00060');
  assert.equal(symbols.get('done'), 0xc008);
  assert.equal(symbols.get('other@loop'), 0xc00b);
});

test('evaluates expressions, low and high bytes', () => {
  assert.equal(hex(`.org $1000
tab = $1234
    .byte <tab, >tab, <(tab+$100), 2*3+1, %101, 'A', -1
    .word tab, *
    .byte "hi"`), '341234070541ff341209106869');
});

test('.res, .align, .org padding and .if', () => {
  assert.equal(hex(`.org $1000
    .byte 1
    .align 4
    .res 2, $ee
    .org $1008
FEATURE = 1
.if FEATURE
    .byte $aa
.else
    .byte $bb
.endif
.if FEATURE == 0
    .byte $cc
.endif`), '01000000eeee0000aa');
});

test('defines override the source and are not exported', () => {
  const { bytes, symbols } = assemble('.org ORG\n    lda #VALUE\n', { defines: { ORG: 0x2000, VALUE: 7 } });
  assert.deepEqual([...bytes], [0xa9, 7]);
  assert.equal(symbols.size, 0);
});

test('reports errors with line numbers', () => {
  assert.throws(() => assemble('.org 0\n  lda nowhere\n'), /line 2: undefined symbol nowhere/);
  assert.throws(() => assemble('.org 0\n  bne far\n  .res 200\nfar: rts\n'), /line 2: branch out of range/);
  assert.throws(() => assemble('.org 0\n  stx $1234,x\n'), /line 2: stx has no/);
  assert.throws(() => assemble('.org 0\n  .assert 1 == 2, "nope"\n'), /line 2: nope/);
  assert.throws(() => assemble('.org 0\nx: nop\nx: nop\n'), /line 3: x defined twice/);
});
