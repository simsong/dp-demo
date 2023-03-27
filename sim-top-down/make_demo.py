#!/usr/bin/env python3

import sys
import os
import os.path

import ctools
import ctools.tydoc as tydoc
from tydoc import TyTag

LOCALHOST_CDN = False
LOCAL_CDN = False
REQUIRED = ['https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.css',
            'https://ajax.googleapis.com/ajax/libs/jquery/3.4.0/jquery.min.js',
            'https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js',
            'demo.css',
            'optimizer.js',
            'demo.js']

SCENARIOS = [ ('1,2,3,4,5,6,101,102,103,104,105,106','Balanced rural and urban blocks'),
              ('1,2,3,400,5,6,101,102,103,104,105,106','One rural block with a LOT of males.'),
              ('1,2,3,4,5,6,101,102,103,104,600,106','One urban block with a LOT of females.'),
              ('1,2,3,4,5,6,101,102,103,104,1,106','One urban block with just one female'),
              ]

class MatrixMaker:
    def __init__(self,id_prefix,editable=True):
        self.id_prefix = id_prefix
        self.editable  = editable;

    def pop_data_fields(self, name, level, f=None, m=None ):
        d1 = TyTag('div', attrib={'class':'dataline1'})
        d1t = TyTag('span', text=f'{name} pop: ', attrib={'class':'datalabel'})
        d1d = TyTag('span', text='tbd', attrib={'class':'data', 'id':self.id_prefix+level+"-pop"})
        d1.extend([d1t,d1d])

        d2 = TyTag('div', attrib={'class':'dataline2'})
        d2t = TyTag('span', text='f: ', attrib={'class':'datalabel'})
        
        d3 = TyTag('div', attrib={'class':'dataline3'})
        d3t = TyTag('span', text='m: ', attrib={'class':'datalabel'})
        
        if self.editable==True and 'Block' in name:
            attrib = {'type':'text', 'min':'0', 'max':'999', 'size':'3', 'class':'data'}
            d2d = TyTag('input',            attrib={**attrib, **{'id':self.id_prefix+level+'-f', 'value':'0'}})
            d3d = TyTag('input',            attrib={**attrib, **{'id':self.id_prefix+level+'-m', 'value':'0'}})
        else:
            attrib = {'class':'data'}
            d2d = TyTag('span', text='tbd', attrib={**attrib, **{'id':self.id_prefix+level+'-f'}})
            d3d = TyTag('span', text='tbd', attrib={**attrib, **{'id':self.id_prefix+level+'-m'}})

        d2.extend([d2t,d2d])
        d3.extend([d3t,d3d])

        return [ d1, d2, d3 ]

    def add_matrix(self,doc):
        t = tydoc.tytable()
        tr = t.tbody.add_tag('tr')
        tr.add_tag_elems('td', self.pop_data_fields('Tiny County', 'county'),    attrib={'colspan':'6'})
        tr = t.tbody.add_tag('tr')
        tr.add_tag_elems('td', self.pop_data_fields('Ruralland ', 'rcounty'),  attrib={'colspan':'3', 'class':'ruralcounty'})
        tr.add_tag_elems('td', self.pop_data_fields('Urbanville', 'ucounty'), attrib={'colspan':'3', 'class':'urbancounty'})
        tr = t.tbody.add_tag('tr')
        tr.add_tag_elems('td', self.pop_data_fields('RBlock<br/>', 'b1'), attrib={'class':'ruralblock block'})
        tr.add_tag_elems('td', self.pop_data_fields('RBlock<br/>', 'b2'), attrib={'class':'ruralblock block'})
        tr.add_tag_elems('td', self.pop_data_fields('RBlock<br/>', 'b3'), attrib={'class':'ruralblock block'})
        tr.add_tag_elems('td', self.pop_data_fields('UBlock<br/>', 'b4'), attrib={'class':'urbanblock block'})
        tr.add_tag_elems('td', self.pop_data_fields('UBlock<br/>', 'b5'), attrib={'class':'urbanblock block'})
        tr.add_tag_elems('td', self.pop_data_fields('UBlock<br/>', 'b6'), attrib={'class':'urbanblock block'})

        doc.append(t)
        return t

if __name__=="__main__":
    doc = tydoc.tydoc()
    # https://developers.google.com/speed/libraries/#jquery

    for url in REQUIRED:
        # Check if we should use our phantom CDN
        if url.startswith('https:'):
            if LOCALHOST_CDN:
                url = 'http://localhost/cdn/' + os.path.basename(url)
            elif LOCAL_CDN:
                url = 'cdn/' + os.path.basename(url)

        if url.endswith('.css'):
            doc.head.add_tag("link",   attrib={'rel':'stylesheet','href':url, 'media':'all'})
        elif url.endswith('.js'):
            doc.head.add_tag("script", attrib={'src':url})
        else:
            raise RuntimeError("Unknown file type: "+url)


    div = doc.body.add_tag("div", attrib={'class':'row'})
    col1 = div.add_tag('div', attrib={'class':'column left'})
    col2 = div.add_tag('div', attrib={'class':'column middle noise'})
    col3 = div.add_tag('div', attrib={'class':'column right'})
                                      
    col1.add_tag_text('p','<i>Confidential database:</i>')
    MatrixMaker('r', editable=True).add_matrix(col1)
    col2.text=('<p>'
               '<div id="bbox"><div id="barrier">Noise Barrier</div></div>'
               '<input id="privatize" type="button" value="privatize!"/><br/>'
               '&epsilon; <select name="epsilon" id="epsilon">'
               '<option>0.1</option>'
               '<option>0.25</option>'
               '<option>0.5</option>'
               '<option>0.75</option>'
               '<option selected="selected">1.0</option>'
               '<option>2.0</option>'
               '<option>5.0</option>'
               '<option>10.0</option>'
               '</select>'
               '</p>' )
    col3.add_tag_text('p','<i>Published official tabulations:</i>')
    MatrixMaker('p', editable=False).add_matrix(col3)
    doc.body.add_tag_text('p','Each rectangle shows the population statistics for a different geographical area. The top is the total population (pop), followed by the number of females (f) and the number of males (m).',attrib={'class':'instructions'}),
    
    doc.body.add_tag_text('p','ε specifies the privacy loss budget. Click <b>privatize!</b> to re-run the privacy mechanism with a different set of random noises.',attrib={'class':'instructions'}),
    
    doc.body.add_tag_text('p','Try changng the number of females or males that was counted on a block and see how it changes the official tabulations. Or choose one of the sample scenarios listed below.',attrib={'class':'instructions'}),
    
    t = tydoc.tytable(attrib={'class':'scenarios'})
    t.add_head(['select','scenario'])

    for (counts,desc) in SCENARIOS:
        t.add_data([TyTag('input',attrib={'type':'button',
                                          'class':'sbutton',
                                          'counts':counts}),
                    desc])
    doc.append(t)

    doc.save("demo.html")
    
