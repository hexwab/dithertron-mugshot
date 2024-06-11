print <<"EOF";
<!doctype html>
<html >
<head>
<meta charset=utf-8>
<title>Dithertron Gallery @ The Tetley</title>
<style>
img.src { width: 320px; height: 240px; }
img.dst { width: 333px; height: 240px; /*image-rendering: pixelated;*/ }
img.big { width: 665px; height: 480px; /*image-rendering: pixelated;*/ }
.block { width: 1em; height: 1em; display: inline-block; border: 1px solid black; }
.tooltip {
  text-decoration:none;
  position:relative;
}

.tooltip .pop {
  display:none;
  border-radius:6px;
  color:black;
  background:white; 
}
 
.tooltip .pop img {
  margin:0px 8px 8px 0;
}
 
.tooltip:hover .pop {
  display:block;
  position:absolute;
  top:0;
  left:0;
  z-index:1000;
  width:auto;
  /*max-width:320px;
  min-height:128px;*/
  border:1px solid black;
  margin-top:12px;
  margin-left:32px;
  overflow:hidden;
  padding:8px;
}
</style>
</head>
<body>

<h2>Dithertron Gallery @ The Tetley</h2>

<p>These PNGs have <em>non-square pixels</em>.  They contain a <code>pHYs</code> chunk that indicates the pixel aspect ratio (PAR) so that software, if it chooses, can display them at their original proportions.  Not much software does this, but in <em>GIMP</em> you can turn off "dot-for-dot" mode.
<ul>
EOF
my $path = ".";
my @imgs = map { /(\d+)/ and $1 or die } glob "$path/*.bin";
#@uniq = 
for my $i (@imgs) {
    my $ula = `cat $i.ula`;
    my @pal = unpack"C*",`cat $i.pal`;
    #print join",",@pal;
    my $mode='???';
    my @lu;
    $mode=0, @lu=(0,8) if $ula==156;
    $mode=1, @lu=(0,2,8,10) if $ula==216;
    $mode=2, @lu=(0,1,2,3,4,5,6,7) if $ula==244;
    my @modeinfo=("832×288, monochrome", "416×288, 4 colours", "208×288, 8 colours");
    my $palblock;
    for my $p (@lu) {
	$palblock.= "<span class=block style=background:#".
	    ((qw[000 f00 0f0 ff0 00f f0f 0ff fff])[7-($pal[$p]&7)]).
	    "></span>";
    }
    my $exesize=(stat "$path/$i")[7] or die "$path/$i: $!";
    my $comp=sprintf"%.1f",(29952-$exesize)/29952*100;
    print <<"EOF";
 <li class="tooltip"><a name="$i"><b>$i</b></a>
 <p><a href=$i.src.png><img src=$i.src.png class=src></a>
 <a href=$i.png><img src=$i.png class="dst tooltip"></a>
 <br>MODE $mode ($modeinfo[$mode]) $palblock
 <br>Raw framebuffer: <a href=$i.bin>$i.bin</a> (29952 bytes)
 <br>Standalone Beeb executable: <a href=$i>$i</a> ($exesize bytes, compressed $comp%), load and exec addresses <code>FFFF2000</code> (.inf file: <a href=$i.inf>$i.inf</a>)
 <br>Bootable DFS disc image: <a href=$i.ssd>$i.ssd</a> (<a href=https://bbc.godbolt.org/#autoboot&disc=https://sphere.chronosempire.org.uk/~HEx/tetley/$i.ssd>emulate</a>)
 <br>Tape image: <a href=$i.uef>$i.uef</a> (<a href=http://playuef.8bitkick.cc/?FILE=https://sphere.chronosempire.org.uk/~HEx/tetley/$i.uef>PlayUEF</a>) <em>(<kbd>*TAPE</kbd> then <kbd>*RUN</kbd>)</em>
EOF
#<span class=pop><a href=$i.png><img src=$i.png class=big></a></span>
}

print <<"EOF";
</body>
</html>
EOF
