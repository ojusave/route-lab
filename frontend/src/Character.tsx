import { Check, Minus, X, ArrowUpRight, LoaderCircle } from "lucide-react";
import type {
  Character as Person,
  CharacterResult,
  Vote,
} from "../../shared/types";
export const voteLabel: Record<Vote, string> = {
  yes: "I'm in",
  undecided: "Not sure yet",
  no: "Not for me",
};

function Portrait({ id, vote }: { id: string; vote?: Vote }) {
  const smile =
    vote === "yes"
      ? "M87 104 Q100 118 113 104"
      : vote === "no"
        ? "M88 112 Q100 103 112 112"
        : "M91 108 Q100 111 109 108";
  return (
    <svg
      viewBox="0 0 200 180"
      className={`portrait portrait-${id}`}
      aria-hidden="true"
    >
      {id === "mina" ? (
        <>
          <path
            d="M54 85C45 26 75 13 100 18C140 6 160 47 146 95L132 130H66Z"
            fill="#533d36"
          />
          <path d="M33 184Q38 133 79 128H121Q160 134 168 184" fill="#cb784c" />
          <path d="M86 119V138Q100 150 115 138V118" fill="#dda382" />
          <ellipse cx="100" cy="78" rx="41" ry="50" fill="#edbc99" />
          <path
            d="M57 73Q57 27 97 24Q139 22 144 72Q119 67 107 40Q93 72 57 73"
            fill="#533d36"
          />
          <path
            d="M76 142L99 157L85 177L65 144M124 142L100 157L115 177L136 144"
            fill="#f7dec0"
          />
          <circle cx="61" cy="99" r="5" fill="#e9b85b" />
          <circle cx="139" cy="99" r="5" fill="#e9b85b" />
        </>
      ) : id === "ravi" ? (
        <>
          <path d="M29 183Q36 132 76 128H125Q168 135 173 183" fill="#4d7869" />
          <path d="M84 117V139Q102 153 117 137V117" fill="#b87f61" />
          <rect x="59" y="26" width="84" height="105" rx="38" fill="#c8916f" />
          <path
            d="M58 70V49Q57 17 90 20Q118 8 141 32L144 61L133 60L130 46Q99 58 65 47L66 72Z"
            fill="#303936"
          />
          <path
            d="M70 104Q100 136 131 104Q126 133 101 136Q79 133 70 104"
            fill="#3d4139"
          />
          <path
            d="M82 139L101 153L120 138"
            fill="none"
            stroke="#c5d7ba"
            strokeWidth="5"
          />
        </>
      ) : (
        <>
          <path d="M33 185Q34 132 79 129H124Q166 141 168 185" fill="#7e689e" />
          <path d="M86 117V138L101 151L116 137V117" fill="#dcab91" />
          <path d="M61 78Q48 20 94 22Q132 5 146 38L138 99Z" fill="#d9d2c4" />
          <ellipse cx="101" cy="80" rx="39" ry="48" fill="#edc7ac" />
          <path
            d="M62 72L55 61L62 31L81 34L89 16L103 29L122 18L133 34L149 39L134 65L122 43L107 55L89 42L74 67Z"
            fill="#e3ded2"
          />
          <path d="M82 139L100 154L121 139L119 183H83Z" fill="#dfd6ec" />
          <path
            d="M65 86H90M111 86H136M91 86H109"
            stroke="#443f51"
            strokeWidth="3"
          />
          <rect
            x="66"
            y="74"
            width="25"
            height="24"
            rx="8"
            fill="none"
            stroke="#443f51"
            strokeWidth="3"
          />
          <rect
            x="110"
            y="74"
            width="25"
            height="24"
            rx="8"
            fill="none"
            stroke="#443f51"
            strokeWidth="3"
          />
        </>
      )}
      <g className="eyes" fill="#302d30">
        <ellipse cx="81" cy="85" rx="3" ry="4" />
        <ellipse cx="119" cy="85" rx="3" ry="4" />
      </g>
      <path
        d="M99 88L96 98H103"
        fill="none"
        stroke="#b57f67"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d={smile}
        fill="none"
        stroke={id === "ravi" ? "#f0c6a8" : "#854d46"}
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {vote === "yes" && (
        <>
          <path
            d="M27 56L31 48M39 40L45 35M163 42L169 49"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

export default function Character({
  person,
  result,
  previous,
  status,
  onInspect,
}: {
  person: Person;
  result?: CharacterResult;
  previous?: CharacterResult;
  status: "idle" | "queued" | "running" | "failed" | "done";
  onInspect: () => void;
}) {
  const change = result?.previousVote && result.previousVote !== result.vote;
  return (
    <button
      className={`character character-${person.id} ${status}`}
      onClick={onInspect}
      aria-label={`Inspect ${person.name}'s ${result ? "decision" : "criteria"}`}
    >
      <div className="character-scene">
        <span className={`vote-pill ${result?.vote ?? "waiting"}`}>
          {result ? (
            <>
              {result.vote === "yes" ? (
                <Check size={13} />
              ) : result.vote === "no" ? (
                <X size={13} />
              ) : (
                <Minus size={13} />
              )}{" "}
              {voteLabel[result.vote]}
            </>
          ) : status === "running" ? (
            <>
              <LoaderCircle size={12} className="spin" /> Thinking
            </>
          ) : status === "queued" ? (
            "Waiting"
          ) : status === "failed" ? (
            "Couldn’t finish"
          ) : (
            "Ready to listen"
          )}
        </span>
        <span className="portrait-backdrop" />
        <Portrait id={person.id} vote={result?.vote} />
        <span className="character-inspect">
          <ArrowUpRight size={16} />
        </span>
      </div>
      <div className="character-copy">
        <div className="character-name">
          <h2>{person.name}</h2>
          <span>{person.role}</span>
        </div>
        <p className="character-concern">{person.concern}</p>
        <p className={`reaction ${result ? "arrived" : ""}`}>
          {result?.reaction ??
            (status === "failed"
              ? "Retry my evaluation to get a vote."
              : status === "running" || status === "queued"
                ? "Reading your pitch…"
                : "")}
        </p>
        {change ? (
          <span className="vote-change">
            {voteLabel[result.previousVote!]} <span>→</span>{" "}
            {voteLabel[result.vote]}
          </span>
        ) : previous && !result ? (
          <span className="previous-vote">
            Last round: {voteLabel[previous.vote]}
          </span>
        ) : result?.reactionSource === "authored" ? (
          <span className="previous-vote">Preset response</span>
        ) : null}
      </div>
    </button>
  );
}
