#!/bin/sh
clear
ID=`date +%H%M%S`
cp -a pic.bin store/$ID.bin
cp -a pal.bin store/$ID.pal
cp -a ula.bin store/$ID.ula
cp -a tmp.png store/$ID.png
cp -a tmp.src.png store/$ID.src.png

./bin/exomizer301 -v|head -3
time ./bin/exomizer301 level -C -c pic.bin@0xb00 -o pic.exo
perl writeim.pl pic.exo >tmp.uef
echo Palette dump:
hd pal.bin|head -1
#printf "ULA byte 0x%02x\n" $(cat ula.bin)
echo
echo Your picture ID is $ID!
#perl -e 'print $_%10 for 0..119;print;print int($_/10)%10 for 0..119;print'
echo
echo -n Waiting 30 seconds for sync...
sleep 30
echo \ done
echo
echo Should have arrived on the server by now here have a QR code
echo
echo It should go here: 'https://sphere.chronosempire.org.uk/~HEx/tetley/#'$ID 
qrencode -t ANSIUTF8 'https://sphere.chronosempire.org.uk/~HEx/tetley/#'$ID |perl -0pe chop |
perl -pe 'BEGIN {print "\e[s\e[1;1H"} END{print "\e[u"} s/^/\e[90G/g' 

#CSI s # save
#CSI 1;1H # move

#s/\n/
#CSI 40  G # move horizontal
#CSI 0 K # clear right
#
#CSU u # restore
