SYNC = $78

BPP=2
WIDTH=416
HEIGHT=288
WIDTH_CHARS=WIDTH*BPP/8
HEIGHT_CHARS=(HEIGHT+7)/8
SCREEN=$8000-WIDTH*HEIGHT*BPP/8

	timeout_hi=$ff
	timeout_lo=$fe
	

	ORG $400
.start
	INCLUDE "exo.s"
	;; get byte from tape
.getbyte
.byteloop1
	lda $fe08
	lsr A
	bcc byteloop1
	lda $fe09
	rts
	
	;; get byte from tape, with timeout and bounds check to impose
	;; some semblance of robustness. called by exo
.get_crunched_byte
	php
.byteloop
	lda zp_dest_hi
	cmp #$09
	bcc abort
	cmp #$81
	bcs abort
	inc timeout_lo
	bne skip1
	inc timeout_hi
	beq abort
.skip1
	lda $fe08
	lsr A
	bcc byteloop
	lda #0
	sta timeout_lo
	sta timeout_hi
	lda $fe09
	plp
	rts

.abort
	lda #$02 ; magenta
;	clc
;.abortloop
	sta $fe21
;	adc #$10
;	bcc abortloop
	
.init
	sei
	lda #$7f ; disable all interrupts, break looks like poweron
        sta $fe4e ; SYSVIA IER

	;lda #$4c
	;sta $287
	;lda #<init
	;sta $288
	;lda #>init
	;sta $289
	
	; clear ACCON; disables shadow screen on both B+ and Master
	lda #0
	sta $fe34
	;; tape on
	lda #&85
	sta $fe10
	lda #&d5
	sta $fe08

	;; init CRTC
	ldx #15
.loop
	lda crtc,X
	stx $fe00
	cpx #8
	bne notv
	lda $291
.notv
	sta $fe01
	dex
	bpl loop
	
	;; main loop

.imageloop
	;; reinit clear
	lda #$0b
	sta clearloop+2
	sta clearloop+5
	
	lda #0
	sta timeout_lo
	sta timeout_hi

	;; wait for 8 sync bytes
.sync1
	ldx #8
.sync2
	jsr getbyte
	cmp #SYNC
	bne sync1
	dex
	bpl sync2
	
	;; screen off
	lda #8
	sta $fe00
	lda #$f8
	ora $291
	sta $fe01
	;; clear
	lda #0
	tax
.clearloop
	sta $b00,X
	sta $b80,X
	inx
	bpl clearloop
	tax
	inc clearloop+2
	inc clearloop+5
	bpl clearloop

	;; wait for non-sync byte
.nonsync
	jsr getbyte
	cmp #SYNC
	beq nonsync
	;; set ULA
	sta $fe20
	
	;; read palette and set CRTC
	ldx #15
.palloop
	jsr getbyte
	sta $fe21
	dex
	bpl palloop
	
	;; restore screen
	lda #8
	sta $fe00
	lda $291
	sta $fe01

	;; load image
	lda #0
	sta zp_dest_lo
	lda #$80
	sta zp_dest_hi
	jsr decrunch

	jmp imageloop
	
.crtc
	equb $7F                                                ; R0 horiz total
	equb WIDTH_CHARS                                        ; R1 horiz displayed
	equb $62+(WIDTH_CHARS-80)/2                             ; R2 horiz sync pos
	equb $28                                                ; R3 horiz sync width
	equb $26                                                ; R4 vert total
	equb $00                                                ; R5 vert total adjust
	equb HEIGHT/8                                           ; R6 vert displayed
	equb $25                                                ; R7 vert sync pos
	equb $00			 			; R8 
	equb $07                                                ; R9 scanlines/char
	equb $20                                                ; R10 cursor start/blink
	equb $08                                                ; R11 cursor end
	equb HI(SCREEN/8)              				; R12 screen address hi
	equb LO(SCREEN/8)              				; R13 screen address lo

.end

	SAVE "mugshot",start,end,init
	
