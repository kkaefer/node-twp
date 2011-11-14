start
  = specification

specification
  = _ root:(protocol / messagedef / structdef)*
  { return root; }

protocol
  = kind:"protocol" _S name:identifier _ "=" _ id:_id _
    "{" _ elements:protocolelement* "}" _
  { return { kind: kind, name: name, id: id, elements: elements, pos: savedPos0 }; }

protocolelement
  = typedef / messagedef

identifier "identifier"
  = first:[a-zA-Z_] subsequent:([a-zA-Z0-9_])*
  { return { pos: savedPos0, value: first + subsequent.join('') }; }

number "number"
  = digits:[0-9]+
  { return parseInt(digits.join(''), 10); }

_any
  = value:"any" _S "defined" _S "by" _S name:identifier
  { return { value: value, base: name.value, pos: savedPos0 } }

type
  = _any / primitiveType / identifier

primitiveType
  = "int" / "string" / "binary" / "any"

typedef
  = structdef / sequencedef / uniondef / forwarddef

structdef
  = kind:"struct" _S name:identifier _ id:("=" _ id:_id _ { return id; })?
    "{" _ fields:field+ "}" _
  { return { kind: kind, name: name, id: id !== '' ? id : null, fields: fields, pos: savedPos0 }; }

field
  = optional:("optional" _)? type:type _S name:identifier _ ";" _
  { return { kind: "field", name: name, type: type, optional: optional !== '', pos: savedPos0 }; }

sequencedef
  = kind:"sequence" _ "<" _ contains:type _ ">" _S name:identifier _ ";" _
  { return { kind: kind, name: name, contains: contains, pos: savedPos0 } }

uniondef
  = kind:"union" _ name:identifier _ "{" _ cases:casedef+ "}" _
  { return { kind: kind, name: name, cases: cases, pos: savedPos0 } }

casedef
  = kind:"case" _S number:number _ ":" _ type:type _S name:identifier _ ";" _
  { return { kind: kind, number: number, type: type, name: name, pos: savedPos0 } }

forwarddef
  = kind:"typedef" _S name:identifier _ ";" _
  { return { kind: kind, name: name, pos: savedPos0 } }

_alternative "alternative"
  = id:[0-7]
  { return parseInt(id, 10); }

_id "ID"
  = "ID" _S id:number
  { return parseInt(id, 10); }

messagedef
  = kind:"message" _S name:identifier _ "=" _ id:(_alternative / _id) _
    "{" _ fields:field* "}" _
  { return { kind: kind, name: name, id: id, fields: fields, pos: savedPos0 }; }

_ "whitespace"
  = whitespace*

_S "whitespace"
  = whitespace+

whitespace
  = [ \t\n\r] / comment

comment
  = blockcomment / linecomment

linecomment
  = "//" [^\n]*

// from pegjs/examples/css
blockcomment
  = "/*" [^*]* "*"+ ([^/*] [^*]* "*"+)* "/"
