/**
 * In-browser translators (Google Translate, etc.) wrap text nodes in <font>,
 * so React's next insertBefore/removeChild throws NotFoundError and can white-screen the app.
 * See facebook/react#11538.
 */
export function installDomTranslationGuard(): void {
  if (typeof Node !== "function" || !Node.prototype) return;
  const g = globalThis as typeof globalThis & { __domTranslationGuardInstalled?: boolean };
  if (g.__domTranslationGuardInstalled) return;
  g.__domTranslationGuardInstalled = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (child.parentNode) {
        return originalRemoveChild.call(child.parentNode, child) as T;
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return originalInsertBefore.call(this, newNode, null) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}
