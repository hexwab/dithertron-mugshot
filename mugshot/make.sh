beebasm -i imlisten.s -do im.ssd -boot mugshot -v >out.txt
rm -f  im.ssd.*
bbcim -e im.ssd
perl writeuef.vanilla.pl im.ssd.mugshot >mugshot.uef

<mugshot.uef ~/uefwalk-1.51/uefwalk --output=bitstream --quiet |
 ~/uefwalk-1.51/kleen/bitclean --verbose --text-input - |
sox -t raw -c 1 -L -b 16 -e signed -r 44100 - mugshot.wav
