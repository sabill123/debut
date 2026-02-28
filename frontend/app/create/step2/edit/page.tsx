"use client";

import { useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { editImage, inpaintImage } from "@/lib/api";
import { MaskCanvas, type MaskCanvasHandle } from "@/components/canvas/MaskCanvas";
import {
  extractReferencedIndices,
  validatePromptReferences,
  getAutocompleteContext,
  insertReference,
} from "@/lib/promptUtils";

type EditMode = "full" | "inpaint";

interface ReferenceImage {
  memberId: string;
  stageName: string;
  imageUrl: string;
  autoSelected: boolean;
}

export default function Step2EditWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <Step2Edit />
    </Suspense>
  );
}

function Step2Edit() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession();

  const targetMemberId = searchParams.get("member") || "";
  const members = session.blueprint?.members || [];
  const targetMember = members.find((m) => m.member_id === targetMemberId);

  const [currentImage, setCurrentImage] = useState<string>(
    session.memberImages[targetMemberId] || ""
  );
  const [editHistory, setEditHistory] = useState<string[]>([]);

  // Edit mode: "full" (text-only edit) or "inpaint" (brush mask + text)
  const [editMode, setEditMode] = useState<EditMode>("full");

  // Prompt state
  const [prompt, setPromptText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mask canvas ref
  const maskCanvasRef = useRef<MaskCanvasHandle>(null);
  const [hasMask, setHasMask] = useState(false);

  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompletePos, setAutocompletePos] = useState(-1);
  const [autoSearchText, setAutoSearchText] = useState("");

  // Reference images
  const referenceImages: ReferenceImage[] = members
    .filter((m) => session.memberImages[m.member_id])
    .map((m) => ({
      memberId: m.member_id,
      stageName: m.stage_name,
      imageUrl: session.memberImages[m.member_id],
      autoSelected: false,
    }));

  const referencedIndices = extractReferencedIndices(prompt);
  const refs = referenceImages.map((ref, idx) => ({
    ...ref,
    autoSelected: referencedIndices.includes(idx),
  }));
  const validation = validatePromptReferences(prompt, referenceImages.length);

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newPrompt = e.target.value;
      setPromptText(newPrompt);
      const cursorPos = e.target.selectionStart;
      const ctx = getAutocompleteContext(newPrompt, cursorPos);
      setShowAutocomplete(ctx.shouldShow);
      setAutocompletePos(ctx.triggerPosition);
      setAutoSearchText(ctx.searchText);
    },
    []
  );

  const handleInsertRef = useCallback(
    (refIndex: number) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const cursorPos = textarea.selectionStart;
      const triggerPos = showAutocomplete ? autocompletePos : cursorPos;
      const endPos = showAutocomplete ? cursorPos : cursorPos;
      const { newText, newCursorPosition } = insertReference(
        prompt,
        triggerPos,
        endPos,
        refIndex + 1
      );
      setPromptText(newText);
      setShowAutocomplete(false);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      }, 0);
    },
    [prompt, showAutocomplete, autocompletePos]
  );

  // Handle edit submission (full or inpaint)
  const handleEdit = async () => {
    if (!prompt.trim() || !currentImage || !session.sessionId) return;

    if (!validation.isValid) {
      setError(
        `잘못된 레퍼런스: ${validation.invalidRefs.map((n) => `@${n}`).join(", ")}`
      );
      return;
    }

    if (editMode === "inpaint" && !hasMask) {
      setError("편집할 영역을 브러쉬로 선택해주세요");
      return;
    }

    setIsEditing(true);
    setError(null);

    try {
      let editInstruction = prompt;
      if (referencedIndices.length > 0) {
        const refContext = referencedIndices
          .map((idx) => {
            const ref = referenceImages[idx];
            return ref ? `@${idx + 1} = ${ref.stageName}의 이미지` : "";
          })
          .filter(Boolean)
          .join(", ");
        editInstruction = `${prompt}\n\n(레퍼런스: ${refContext})`;
      }

      let result: { image_url: string };

      if (editMode === "inpaint") {
        const maskData = maskCanvasRef.current?.generateMaskData();
        if (!maskData) {
          setError("마스크 데이터를 생성할 수 없습니다");
          setIsEditing(false);
          return;
        }
        result = await inpaintImage({
          session_id: session.sessionId,
          member_id: targetMemberId,
          base_image_b64: currentImage,
          mask_image_b64: maskData,
          edit_instructions: editInstruction,
        });
      } else {
        result = await editImage({
          session_id: session.sessionId,
          member_id: targetMemberId,
          reference_image_b64: currentImage,
          edit_instructions: editInstruction,
        });
      }

      setEditHistory((prev) => [...prev, currentImage]);
      setCurrentImage(result.image_url);
      setPromptText("");
      maskCanvasRef.current?.clearMask();
      setHasMask(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "이미지 편집에 실패했습니다"
      );
    } finally {
      setIsEditing(false);
    }
  };

  const handleUndo = () => {
    if (editHistory.length === 0) return;
    const prev = editHistory[editHistory.length - 1];
    setEditHistory((h) => h.slice(0, -1));
    setCurrentImage(prev);
  };

  const handleSave = () => {
    if (currentImage && targetMemberId) {
      session.setMemberImage(targetMemberId, currentImage);
    }
    router.push("/create/step2");
  };

  const handleCancel = () => {
    router.push("/create/step2");
  };

  const filteredAutoComplete = autoSearchText
    ? referenceImages.filter((_, idx) =>
        String(idx + 1).startsWith(autoSearchText)
      )
    : referenceImages;

  if (!targetMember) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-red-400">멤버를 찾을 수 없습니다.</p>
        <button
          onClick={() => router.push("/create/step2")}
          className="mt-4 px-6 py-2 bg-zinc-800 text-zinc-300 rounded-lg"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">
            {targetMember.stage_name} 비주얼 편집
          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            @1, @2... 로 다른 멤버의 이미지를 레퍼런스하여 편집할 수 있습니다
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-sm hover:bg-zinc-700"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold"
          >
            수정 완료
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Reference Images Panel */}
        <div className="col-span-3">
          <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
            레퍼런스 이미지
          </h3>
          <div className="space-y-2">
            {refs.map((ref, idx) => (
              <button
                key={ref.memberId}
                onClick={() => handleInsertRef(idx)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${
                  ref.autoSelected
                    ? "border-cyan-500 bg-cyan-500/10"
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                }`}
              >
                <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={ref.imageUrl}
                    alt={ref.stageName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-400 truncate">
                    {ref.stageName}
                  </p>
                </div>
                <span
                  className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                    ref.autoSelected
                      ? "bg-cyan-500 text-white"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  @{idx + 1}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <p className="text-xs text-zinc-600 mb-2">빠른 삽입</p>
            <div className="flex flex-wrap gap-1">
              {referenceImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => handleInsertRef(idx)}
                  className={`text-xs px-2 py-1 rounded ${
                    referencedIndices.includes(idx)
                      ? "bg-cyan-500 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  @{idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Image Preview / Mask Canvas */}
        <div className="col-span-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            {editMode === "inpaint" && currentImage ? (
              <MaskCanvas
                ref={maskCanvasRef}
                imageSrc={currentImage}
                onMaskChange={setHasMask}
              />
            ) : (
              <div className="aspect-[9/16] max-h-[600px] bg-zinc-950 flex items-center justify-center relative">
                {currentImage ? (
                  <img
                    src={currentImage}
                    alt={targetMember.stage_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <p className="text-zinc-600">이미지 없음</p>
                )}

                {isEditing && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-cyan-300 text-sm">편집 중...</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Image info bar */}
            <div className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{targetMember.stage_name}</p>
                <p className="text-xs text-zinc-500">{targetMember.position}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUndo}
                  disabled={editHistory.length === 0}
                  className="text-xs px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg disabled:opacity-30 hover:bg-zinc-700"
                >
                  되돌리기 ({editHistory.length})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Edit Controls Panel */}
        <div className="col-span-4">
          {/* Mode Tabs */}
          <div className="flex gap-1 mb-4 bg-zinc-900 p-1 rounded-xl">
            <button
              onClick={() => setEditMode("full")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                editMode === "full"
                  ? "bg-cyan-600 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              전체편집
            </button>
            <button
              onClick={() => setEditMode("inpaint")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                editMode === "inpaint"
                  ? "bg-cyan-600 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              선택편집
            </button>
          </div>

          {editMode === "inpaint" && (
            <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-xs text-blue-300">
                이미지에서 수정할 영역을 브러쉬로 칠한 후, 아래에 수정 내용을 입력하세요.
              </p>
            </div>
          )}

          <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
            {editMode === "full" ? "편집 지시" : "선택 영역 편집"}
          </h3>

          {/* Prompt Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={handlePromptChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleEdit();
                }
                if (e.key === "Escape") {
                  setShowAutocomplete(false);
                }
              }}
              placeholder={
                editMode === "inpaint"
                  ? "예: 머리 색을 은색으로 변경"
                  : "예: @1 머리 색을 은색으로 변경해줘"
              }
              className={`w-full h-28 bg-zinc-900 border rounded-xl p-4 text-sm text-white placeholder:text-zinc-600 resize-none focus:outline-none focus:ring-1 ${
                !validation.isValid
                  ? "border-red-500 focus:ring-red-500"
                  : "border-zinc-800 focus:ring-cyan-500"
              }`}
            />

            {showAutocomplete && filteredAutoComplete.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-lg z-10">
                {filteredAutoComplete.map((ref) => {
                  const originalIdx = referenceImages.findIndex(
                    (r) => r.memberId === ref.memberId
                  );
                  return (
                    <button
                      key={ref.memberId}
                      onClick={() => handleInsertRef(originalIdx)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                        <img
                          src={ref.imageUrl}
                          alt={ref.stageName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-cyan-400 font-mono text-sm">
                        @{originalIdx + 1}
                      </span>
                      <span className="text-sm text-zinc-300">
                        {ref.stageName}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {!validation.isValid && (
            <p className="mt-2 text-xs text-red-400">
              잘못된 레퍼런스:{" "}
              {validation.invalidRefs.map((n) => `@${n}`).join(", ")}
            </p>
          )}

          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

          <button
            onClick={handleEdit}
            disabled={
              isEditing ||
              !prompt.trim() ||
              !validation.isValid ||
              (editMode === "inpaint" && !hasMask)
            }
            className="w-full mt-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEditing
              ? "편집 중..."
              : editMode === "inpaint"
                ? "선택 영역 편집 적용"
                : "편집 적용"}
          </button>

          {/* Prompt suggestions */}
          <div className="mt-5">
            <p className="text-xs text-zinc-600 mb-2">편집 예시</p>
            <div className="space-y-1.5">
              {(editMode === "inpaint"
                ? [
                    "머리 색을 은색으로",
                    "눈 색을 파란색으로",
                    "립 색을 레드로",
                    "이어링 추가",
                    "문신 추가",
                  ]
                : [
                    "머리 색을 은색으로 변경",
                    "더 강렬한 눈빛으로",
                    "의상을 검은 가죽 자켓으로",
                    "배경을 네온 조명으로",
                    "더 시크한 표정으로",
                    "@1 스타일로 헤어 변경",
                  ]
              ).map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setPromptText(suggestion)}
                  className="w-full text-left text-xs px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/30 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Edit history */}
          {editHistory.length > 0 && (
            <div className="mt-5">
              <p className="text-xs text-zinc-600 mb-2">
                편집 히스토리 ({editHistory.length})
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-2">
                {editHistory.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setEditHistory((h) => h.slice(0, idx));
                      setCurrentImage(img);
                    }}
                    className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-700 hover:border-cyan-500 transition-colors"
                  >
                    <img
                      src={img}
                      alt={`History ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
