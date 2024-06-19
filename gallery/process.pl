print <<"EOF";
<!doctype html>
<html >
<head>
<meta charset=utf-8>
<title>Dithertron Gallery @ BSides Leeds 2024</title>
<style>
img.src { width: 320px; height: 240px; }
img.dst { width: 333px; height: 240px; image-rendering: pixelated; }
img.big { width: 665px; height: 480px; image-rendering: pixelated; }
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

<h2>Dithertron Gallery</h2>

<p>These are all the pictures displayed on the BBC Master at BSides Leeds 2024.

<p>Source is at <a href=https://github.com/hexwab/dithertron-mugshot>https://github.com/hexwab/dithertron-mugshot</a>.

<p>Instruction sheet: <a href=/~HEx/dithertetley.pdf>PDF</a> <a href=/~HEx/dithertetley.odt>ODT</a>.

<p>Still no blog post one year on :( 

<h3>Gallery disc images</h3>

<p>Single-sided DFS format (.ssd), 204800 bytes:

<ul>
  <li>Disc 1: <a href=gallery1.ssd>gallery1.ssd</a> (<a href="https://bbc.godbolt.org/#disc=https://sphere.chronosempire.org.uk/~HEx/gallery2/gallery1.ssd">emulate</a>)
  <li>Disc 2: <a href=gallery2.ssd>gallery2.ssd</a> (<a href="https://bbc.godbolt.org/#disc=https://sphere.chronosempire.org.uk/~HEx/gallery2/gallery2.ssd">emulate</a>)
</ul>
<p><em>Type <kbd>*.</kbd> for a list and <kbd>*&lt;filename&gt;</kbd> to  display a picture.</em>

<p>Double-sided DFS format (.dsd), 409600 bytes:
<ul>
  <li><a href=gallery.dsd>gallery.dsd</a>
(<a href="https://bbc.godbolt.org/#disc=https://sphere.chronosempire.org.uk/~HEx/gallery2/gallery.dsd">emulate</a>)
</ul>
<p><em>Type <kbd>*DRIVE 0</kbd> or <kbd>*DRIVE 2</kbd> to switch sides.</em>
<p>

<p>ADFS "L" format, 655360 bytes:</p>
<ul>
  <li>
    <a href=gallery.adl>gallery.adl</a>
(<a href="https://bbc.godbolt.org/#model=B1770A&disc=https://sphere.chronosempire.org.uk/~HEx/gallery2/gallery.adl">emulate</a>)
</ul>

<h3>Individual pictures</h3>

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
 <li class="tooltip"><b>$i</b>
 <p><a href=$i.src.png><img src=$i.src.png class=src></a>
 <a href=$i.png><img src=$i.png class="dst tooltip"></a>
 <br>MODE $mode ($modeinfo[$mode]) $palblock
 <br>Raw framebuffer: <a href=$i.bin>$i.bin</a> (29952 bytes)
 <br>Standalone Beeb executable: <a href=$i>$i</a> ($exesize bytes, compressed $comp%), load and exec addresses <code>FFFF2000</code> (.inf file: <a href=$i.inf>$i.inf</a>)
 <br>Bootable DFS disc image: <a href=$i.ssd>$i.ssd</a> (<a href=https://bbc.godbolt.org/#autoboot&disc=https://sphere.chronosempire.org.uk/~HEx/gallery2/$i.ssd>emulate</a>)
 <br>Tape image: <a href=$i.uef>$i.uef</a> (<a href=http://playuef.8bitkick.cc/?FILE=https://sphere.chronosempire.org.uk/~HEx/gallery2/$i.uef>PlayUEF</a>) <em>(<kbd>*TAPE</kbd> then <kbd>*RUN</kbd>)</em>
EOF
#<span class=pop><a href=$i.png><img src=$i.png class=big></a></span>
}

print <<"EOF";
</ul>
<hr>
<em>Tom Hargreaves &lt;<a href=mailto:hex\@sphere.chronosempire.org.uk>hex\@sphere.chronosempire.org.uk</a>&gt;, 2024-06-18</em>
</body>
</html>
EOF
