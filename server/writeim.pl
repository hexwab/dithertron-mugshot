#!/usr/bin/perl -w
undef $/;
print "UEF File!\x00\x01\x00";
chunk(0x110,pack"v",500); # carrier
$data = "\x78" x 100; # sync
{ open F,"pal.bin" or die; $pal=<F> }
{ open F,"ula.bin" or die; $ula=int<F> }
#$data .= "\xf4" ; # MODE 2
my $mode='???';
$mode=0 if $ula==156;
$mode=1 if $ula==216;
$mode=2 if $ula==244;
printf STDERR "ULA byte is 0x%02x (MODE %s)\n", $ula, $mode;
$data .= pack"C",$ula;
die unless length($pal)==16;
$data .= $pal;
#$data .= "\x07\x16\x25\x34\x43\x52\x61\x70\x87\x96\xa5\xb4\xc3\xd2\xe1\xf0"; # pal
$file=<>;
$file = substr($file, 2);
$data .= $file;
$data .= "\x00"x16;
chunk(0x100,$data);
chunk(0x110,pack"v",100); # carrier

sub chunk {
    my ($id,$data)=@_;
    print pack"vV",$id,length$data;
    print $data;
}
