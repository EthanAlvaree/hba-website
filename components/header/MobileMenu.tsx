// components/header/MobileMenu.tsx
"use client"

import { Fragment } from "react"
import { Dialog, Transition, Disclosure } from "@headlessui/react"
import { XMarkIcon, ChevronDownIcon } from "@heroicons/react/24/outline"
import Link from "next/link"
import type { NavItem } from "@/lib/navigation"

interface MobileMenuProps {
  open: boolean
  onClose: () => void
  items: NavItem[]
}

export default function MobileMenu({ open, onClose, items }: MobileMenuProps) {
  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[200]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-out duration-200"
              enterFrom="translate-x-full"
              enterTo="translate-x-0"
              leave="transform transition ease-in duration-150"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full"
            >
              <Dialog.Panel className="w-screen max-w-sm bg-white shadow-xl flex flex-col">
                <div className="flex items-center justify-between px-4 py-4 border-b">
                  <Dialog.Title className="text-base font-semibold text-gray-900">
                    Menu
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-md p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <nav className="space-y-2">
                    {items.map((item) =>
                      item.columns ? (
                        <Disclosure
                          key={item.title}
                          as="div"
                          className="border-b last:border-b-0 pb-2"
                        >
                          {({ open }) => (
                            <>
                              <Disclosure.Button className="flex w-full items-center justify-between py-2 text-left text-base font-medium text-gray-900">
                                <span>{item.title}</span>
                                <ChevronDownIcon
                                  className={`h-5 w-5 text-gray-500 transition-transform ${
                                    open ? "rotate-180" : ""
                                  }`}
                                />
                              </Disclosure.Button>
                              <Disclosure.Panel className="pl-2 pb-2 space-y-3">
                                {item.columns?.map((col) => (
                                  <div key={col.heading}>
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                                      {col.heading}
                                    </h4>
                                    <ul className="space-y-1">
                                      {col.links.map((link) => (
                                        <li key={link.href}>
                                          <Link
                                            href={link.href}
                                            className="text-sm text-gray-700 py-1 block"
                                            onClick={onClose}
                                          >
                                            {link.label}
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </Disclosure.Panel>
                            </>
                          )}
                        </Disclosure>
                      ) : (
                        <div key={item.title} className="border-b last:border-b-0">
                          <Link
                            href={item.href || "#"}
                            className="w-full block py-2 text-base font-medium text-gray-900"
                            onClick={onClose}
                          >
                            {item.title}
                          </Link>
                        </div>
                      )
                    )}

                    <div className="pt-4">
                      <Link
                        href="https://secure.gradelink.com/2962/enrollment"
                        className="w-full block text-center bg-[#f37021] text-white py-2 rounded-sm font-semibold text-sm"
                        onClick={onClose}
                      >
                        Apply
                      </Link>
                    </div>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
