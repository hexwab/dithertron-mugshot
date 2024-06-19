#!/usr/bin/perl -w
use Digest::CRC qw[crc];

my $filename=shift or die "missing filename";
open FILE, $filename or die "$filename: $!";
my $infname="$filename.inf";
($fn,$load,$exec)=($filename,0,0);
if (open INF, $infname) {
    if ((my $inf=<INF>)=~/^(.*?)\s+(.*?)\s+(.*?)$/) {
	($fn,$load,$exec)=($1,hex$2,hex$3);
    } else {
	warn "$infname: parse error";
    }
} else {
    warn "$infname: $!";
}

print "UEF File!\x00\x01\x00";
chunk(0x110,pack"v",1000); # carrier
$/=\256;
while ($data=<FILE>) {
    $blkno=$n++;
    $blklen=length$data;
    $flags=0|(eof&&0x80); #81;
    my $header=$fn.pack"CVVvvCV",0,
	$load,$exec,$blkno,$blklen,$flags,0;
    $header='*'.$header.pack"n",crc($header,16,0,0,0,0x1021,0,0);
    $data.=pack"n",crc($data,16,0,0,0,0x1021,0,0);
    chunk(0x100,$header.$data);
    chunk(0x110,pack"v",1000); # carrier
}

sub chunk {
    my ($id,$data)=@_;
    print pack"vV",$id,length$data;
    print $data;
}
